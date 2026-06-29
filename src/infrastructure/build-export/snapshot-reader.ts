// T010 (006) — Lector del source snapshot semántico inicial. Una sola lectura raw → decodificación
// UTF-8 estricta → un JSON.parse → un análisis 002 → una proyección 004. Reutiliza la tubería
// `analyzeExistingDesignSystem` con un reader que captura los bytes crudos exactos del documento de
// tokens en su ÚNICA lectura (sin segunda lectura, sin segundo analyzer/grafo). No escribe, no cambia
// mtime, no expone bytes crudos en resultados públicos.
import type {
  AnalyzeDesignSystemInput,
  ManagedDocumentReader,
  ManagedDocumentReadRequest,
} from "../../application/analysis-ports.js";
import type { AnalyzeDesignSystemDependencies } from "../../application/analysis-ports.js";
import { analyzeExistingDesignSystem } from "../../application/analyze-existing-design-system.js";
import { isHostUnresolved } from "../../application/classify-analysis-outcome.js";
import { projectFoundationMetadata } from "../../application/foundations/metadata-pass.js";
import { projectFoundations } from "../../application/foundations/project-foundations.js";
import type { ProjectFoundationsUseCase, ProjectFoundationMetadataUseCase } from "../../application/foundations/foundations-ports.js";
import { buildResolvedTokenView } from "../../application/build-export/resolved-token-view.js";
import type { AnalyzedSourceSnapshot, SourceSnapshotReader, SourceSnapshotResult } from "../../application/build-export/build-ports.js";
import { MANAGED_FILES } from "../../domain/plan/managed-files.js";
import { documentValidators, hostRootResolver } from "../initialize-adapters.js";
import { nodeFileSystem } from "../fs/node-file-system.js";
import { inspectPresence } from "../host-root/inspect-presence.js";
import { createManagedDocumentReader } from "../analysis/managed-document-reader.js";
import { createDtcgAnalyzer } from "../analysis/dtcg-read-validator.js";
import { sha256Hex } from "./hash.js";

export interface BuildSnapshotReaderDeps {
  readonly hostRootResolver: AnalyzeDesignSystemDependencies["hostRootResolver"];
  readonly presenceInspector: AnalyzeDesignSystemDependencies["presenceInspector"];
  readonly documentReader: ManagedDocumentReader;
  readonly documentValidators: AnalyzeDesignSystemDependencies["documentValidators"];
  readonly dtcgAnalyzer: AnalyzeDesignSystemDependencies["dtcgAnalyzer"];
  readonly projectMetadata: ProjectFoundationMetadataUseCase;
  readonly projectInspection: ProjectFoundationsUseCase;
}

function realDeps(): BuildSnapshotReaderDeps {
  return {
    hostRootResolver,
    presenceInspector: { inspectPresence },
    documentReader: createManagedDocumentReader({ fileSystem: nodeFileSystem }),
    documentValidators,
    dtcgAnalyzer: createDtcgAnalyzer(),
    projectMetadata: projectFoundationMetadata,
    projectInspection: projectFoundations,
  };
}

/**
 * Crea el lector de snapshot. Las dependencias son inyectables para tests (spies/seams de one-pass);
 * por defecto usa la composición real de infraestructura.
 */
export function createBuildSnapshotReader(overrides: Partial<BuildSnapshotReaderDeps> = {}): SourceSnapshotReader {
  const deps: BuildSnapshotReaderDeps = { ...realDeps(), ...overrides };

  return {
    async read(input: AnalyzeDesignSystemInput): Promise<SourceSnapshotResult> {
      // Decorator de captura: fija `captureSource` solo para el documento de tokens y conserva sus bytes
      // crudos exactos de la ÚNICA lectura que hace la tubería.
      let capturedTokens: { readonly rawBytes: Uint8Array; readonly content: string } | null = null;
      const capturingReader: ManagedDocumentReader = {
        async read(request: ManagedDocumentReadRequest) {
          const augmented = request.document === "tokens" ? { ...request, captureSource: true } : request;
          const result = await deps.documentReader.read(augmented);
          if (result.ok && request.document === "tokens" && result.rawBytes !== undefined) {
            capturedTokens = { rawBytes: result.rawBytes, content: result.content };
          }
          return result;
        },
      };

      const analysis = await analyzeExistingDesignSystem(input, {
        hostRootResolver: deps.hostRootResolver,
        presenceInspector: deps.presenceInspector,
        documentReader: capturingReader,
        documentValidators: deps.documentValidators,
        dtcgAnalyzer: deps.dtcgAnalyzer,
      });

      if (isHostUnresolved(analysis) || analysis.structuralState === "not-initialized") {
        return { outcome: "not-found", snapshot: null, reason: "Design System no inicializado o host no resuelto." };
      }

      const tokensDoc = analysis.documents[MANAGED_FILES.tokens];
      if (tokensDoc === undefined || !tokensDoc.exists) {
        return { outcome: "not-found", snapshot: null, reason: "Documento de tokens ausente." };
      }
      // Lectura/parseo fallido (UTF-8 inválido, IO o JSON corrupto): read-error.
      if (tokensDoc.parsed === undefined || capturedTokens === null) {
        return { outcome: "read-error", snapshot: null, reason: "No se pudo leer o parsear el documento de tokens." };
      }

      const captured: { readonly rawBytes: Uint8Array; readonly content: string } = capturedTokens;
      const sourceHash = sha256Hex(captured.rawBytes);
      const resolvedTokenView = buildResolvedTokenView(analysis, sourceHash);
      const metadata = deps.projectMetadata(tokensDoc.parsed);
      const foundationProjection = deps.projectInspection(analysis, metadata);

      const snapshot: AnalyzedSourceSnapshot = Object.freeze({
        logicalSourcePath: MANAGED_FILES.tokens,
        rawBytes: captured.rawBytes,
        sourceHash,
        decodedText: captured.content,
        parsedDocument: tokensDoc.parsed,
        analysis,
        resolvedTokenView,
        foundationProjection,
      });

      return { outcome: "ready", snapshot };
    },
  };
}
