// T023 (007) — Reporter JSON de assets. Para outcomes esperados escribe UN único `AssetJsonEnvelopeV1`
// en stdout (stderr vacío). `internalError` (adapter) escribe el envelope `internal-error` en stderr.
import {
  assetInternalErrorEnvelope,
  mapInspectResultToJsonEnvelope,
  mapListResultToJsonEnvelope,
  type AssetJsonCommand,
} from "../../application/assets/json/map-assets.js";
import type { AssetInspectResult, AssetListResult } from "../../application/assets/asset-ports.js";
import type { OutputWriter } from "./terminal-reporter.js";
import { serializeAssetJsonV1 } from "./assets-json-serializer.js";

export class AssetsJsonReporter {
  constructor(private readonly io: OutputWriter) {}

  listCompleted(result: AssetListResult): void {
    this.io.out(serializeAssetJsonV1(mapListResultToJsonEnvelope(result)));
  }

  inspectCompleted(result: AssetInspectResult): void {
    this.io.out(serializeAssetJsonV1(mapInspectResultToJsonEnvelope(result)));
  }

  internalError(command: AssetJsonCommand): void {
    this.io.err(serializeAssetJsonV1(assetInternalErrorEnvelope(command)));
  }
}
