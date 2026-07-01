import { writeFile } from "node:fs/promises";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { startViewerHttpServer, type ViewerHttpServerHandle } from "../../../src/infrastructure/viewer/http-server.js";
import { makeHostProject, type HostProject } from "../../helpers/build-host.js";
import { newCallCounts, realViewerDeps } from "../../application/viewer/real-deps.js";

const hosts: HostProject[] = [];
const handles: ViewerHttpServerHandle[] = [];

afterEach(async () => {
  await Promise.all(handles.splice(0).map((handle) => handle.close()));
  await Promise.all(hosts.splice(0).map((host) => host.cleanup()));
});

const COMPONENT_TOKENS = {
  color: {
    $type: "color",
    base: {
      "blue-500": {
        $value: { colorSpace: "srgb", components: [0.231372549, 0.509803922, 0.964705882], alpha: 1, hex: "#3b82f6" },
      },
    },
    semantic: {
      action: { $value: "{color.base.blue-500}" },
    },
    button: {
      bg: {
        default: {
          $value: "{color.semantic.action}",
          $extensions: { "ar.neuraz.design-system": { layer: "component", component: "button", part: "container", variant: "default", state: "rest", property: "background" } },
        },
        hover: {
          $value: "{color.semantic.action}",
          $extensions: { "ar.neuraz.design-system": { layer: "component", component: "button", part: "container", variant: "default", state: "hover", property: "background" } },
        },
        primaryLarge: {
          $value: "{color.semantic.action}",
          $extensions: { "ar.neuraz.design-system": { layer: "component", component: "button", part: "container", variant: "primary", size: "large", property: "background" } },
        },
      },
      label: {
        default: {
          $value: "{color.semantic.action}",
          $extensions: { "ar.neuraz.design-system": { layer: "component", component: "button", part: "label", variant: "default", state: "rest", property: "color" } },
        },
      },
    },
  },
};

describe("components view section (T026)", () => {
  it("GET /api/section/components agrupa tokens component y expone matrices declaradas", async () => {
    const host = await makeHostProject();
    hosts.push(host);
    await writeFile(join(host.dir, "design-system", "tokens", "base.tokens.json"), `${JSON.stringify(COMPONENT_TOKENS, null, 2)}\n`, "utf8");
    const handle = await startViewerHttpServer({ deps: realViewerDeps(host.dir, newCallCounts()), executionDir: host.dir, host: "127.0.0.1" });
    handles.push(handle);

    const res = await fetch(`http://127.0.0.1:${handle.port}/api/section/components`);
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      readonly section: string;
      readonly data: readonly {
        readonly component: string;
        readonly parts: readonly string[];
        readonly variants: readonly string[];
        readonly states: readonly string[];
        readonly sizes: readonly string[];
        readonly tokens: readonly { readonly path: string }[];
        readonly matrices: readonly { readonly kind: string; readonly cells: readonly { readonly row: string; readonly column: string; readonly paths: readonly string[] }[] }[];
      }[];
    };
    expect(body.section).toBe("components");
    expect(body.data).toHaveLength(1);
    const button = body.data[0]!;
    expect(button.component).toBe("button");
    expect(button.parts).toEqual(["container", "label"]);
    expect([...button.variants].sort()).toEqual(["default", "primary"]);
    expect([...button.states].sort()).toEqual(["hover", "rest"]);
    expect(button.sizes).toEqual(["large"]);
    expect(button.tokens).toHaveLength(4);
    expect(button.matrices.map((matrix) => matrix.kind)).toEqual(
      expect.arrayContaining(["variant-state", "size-variant", "part-property"]),
    );
    expect(
      button.matrices
        .find((matrix) => matrix.kind === "variant-state")
        ?.cells.find((cell) => cell.row === "default" && cell.column === "hover")
        ?.paths,
    ).toEqual(["color.button.bg.hover"]);
  });
});
