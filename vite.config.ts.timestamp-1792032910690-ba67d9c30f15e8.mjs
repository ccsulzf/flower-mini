var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __commonJS = (cb, mod) => function __require() {
  return mod || (0, cb[__getOwnPropNames(cb)[0]])((mod = { exports: {} }).exports, mod), mod.exports;
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// scripts/material-admin-config.cjs
var require_material_admin_config = __commonJS({
  "scripts/material-admin-config.cjs"(exports, module) {
    "use strict";
    function materialAdminEnabled2(command, mode, uniNodeEnv) {
      if (uniNodeEnv)
        return uniNodeEnv === "development" && mode !== "production";
      return command === "serve" && mode !== "production";
    }
    var sanitizedContexts = /* @__PURE__ */ new WeakSet();
    function excludeMaterialAdmin2(context) {
      if (sanitizedContexts.has(context))
        return;
      sanitizedContexts.add(context);
      const generate = context.genratePagesJSON.bind(context);
      context.genratePagesJSON = async () => {
        const result = await generate();
        result.subPackages = (result.subPackages || []).filter((item) => ![
          "subpackages/material-admin",
          "subpackages/daily-flower-admin"
        ].includes(item.root));
        return result;
      };
    }
    module.exports = { materialAdminEnabled: materialAdminEnabled2, excludeMaterialAdmin: excludeMaterialAdmin2 };
  }
});

// vite.config.ts
var import_material_admin_config = __toESM(require_material_admin_config(), 1);
import path from "node:path";
import Uni from "file:///Users/lizhifeng/lzf_workspace/flower_mini/node_modules/.pnpm/@uni-helper+plugin-uni@0.1.0_@dcloudio+vite-plugin-uni@3.0.0-4070520250711001_@vueuse+core@13_fx6kurf7dxpchzgs2seingp5ta/node_modules/@uni-helper/plugin-uni/src/index.js";
import UniHelperComponents from "file:///Users/lizhifeng/lzf_workspace/flower_mini/node_modules/.pnpm/@uni-helper+vite-plugin-uni-components@0.2.3_rollup@4.41.1/node_modules/@uni-helper/vite-plugin-uni-components/dist/index.mjs";
import UniHelperLayouts from "file:///Users/lizhifeng/lzf_workspace/flower_mini/node_modules/.pnpm/@uni-helper+vite-plugin-uni-layouts@0.1.11_rollup@4.41.1/node_modules/@uni-helper/vite-plugin-uni-layouts/dist/index.mjs";
import UniHelperManifest from "file:///Users/lizhifeng/lzf_workspace/flower_mini/node_modules/.pnpm/@uni-helper+vite-plugin-uni-manifest@0.2.9_vite@5.2.8_@types+node@24.1.0_sass@1.94.1_terser@5.37.0_/node_modules/@uni-helper/vite-plugin-uni-manifest/dist/index.mjs";
import UniHelperPages from "file:///Users/lizhifeng/lzf_workspace/flower_mini/node_modules/.pnpm/@uni-helper+vite-plugin-uni-pages@0.3.19_vite@5.2.8_@types+node@24.1.0_sass@1.94.1_terser@5.37.0_/node_modules/@uni-helper/vite-plugin-uni-pages/dist/index.mjs";
import UnoCSS from "file:///Users/lizhifeng/lzf_workspace/flower_mini/node_modules/.pnpm/unocss@66.0.0_postcss@8.5.6_vite@5.2.8_@types+node@24.1.0_sass@1.94.1_terser@5.37.0__vue@3.4.21_typescript@5.8.3_/node_modules/unocss/dist/vite.mjs";
import AutoImport from "file:///Users/lizhifeng/lzf_workspace/flower_mini/node_modules/.pnpm/unplugin-auto-import@19.3.0_@vueuse+core@13.5.0_vue@3.4.21_typescript@5.8.3__/node_modules/unplugin-auto-import/dist/vite.js";
import { defineConfig } from "file:///Users/lizhifeng/lzf_workspace/flower_mini/node_modules/.pnpm/vite@5.2.8_@types+node@24.1.0_sass@1.94.1_terser@5.37.0/node_modules/vite/dist/node/index.js";
import UniPolyfill from "file:///Users/lizhifeng/lzf_workspace/flower_mini/node_modules/.pnpm/vite-plugin-uni-polyfill@0.1.0/node_modules/vite-plugin-uni-polyfill/dist/index.mjs";
var __vite_injected_original_dirname = "/Users/lizhifeng/lzf_workspace/flower_mini";
var basePageExclude = [
  "**/components/**",
  "**/ui/**",
  "**/partials/**"
];
var productionPageExclude = [
  "**/debug*.vue",
  "**/test*.vue"
];
var vite_config_default = defineConfig(({ command, mode }) => {
  const includeMaterialAdmin = (0, import_material_admin_config.materialAdminEnabled)(command, mode, process.env.UNI_NODE_ENV || process.env.NODE_ENV);
  const pageExclude = mode === "production" ? [...basePageExclude, ...productionPageExclude] : basePageExclude;
  return {
    define: {
      __MATERIAL_ADMIN__: JSON.stringify(includeMaterialAdmin),
      __DAILY_FLOWER_ADMIN__: JSON.stringify(includeMaterialAdmin)
    },
    resolve: {
      alias: {
        "@": path.resolve(__vite_injected_original_dirname, "src")
      }
    },
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: '@use "@/styles/variables.scss" as *;'
        }
      }
    },
    esbuild: {
      target: "es2015"
    },
    build: {
      target: "es2015"
    },
    plugins: [
      // https://uni-helper.js.org/vite-plugin-uni-manifest
      UniHelperManifest(),
      // https://uni-helper.js.org/vite-plugin-uni-pages
      UniHelperPages({
        dir: "src/pages",
        // 👈 明确主包
        subPackages: includeMaterialAdmin ? ["src/subpackages/material-admin", "src/subpackages/daily-flower-admin"] : [],
        mergePages: true,
        onBeforeWriteFile: includeMaterialAdmin ? void 0 : import_material_admin_config.excludeMaterialAdmin,
        dts: "src/uni-pages.d.ts",
        // 避免把页面内的子组件当成页面打包
        exclude: pageExclude
      }),
      // https://uni-helper.js.org/vite-plugin-uni-layouts
      UniHelperLayouts(),
      // https://uni-helper.js.org/vite-plugin-uni-components
      UniHelperComponents({
        dts: "src/components.d.ts",
        directoryAsNamespace: false,
        collapseSamePrefixes: true
      }),
      // https://uni-helper.js.org/plugin-uni
      Uni(),
      UniPolyfill(),
      // https://github.com/antfu/unplugin-auto-import
      AutoImport({
        imports: ["vue", "@vueuse/core", "uni-app"],
        dts: "src/auto-imports.d.ts",
        dirs: ["src/composables", "src/stores", "src/utils"],
        vueTemplate: true
      }),
      // https://github.com/antfu/unocss
      // see unocss.config.ts for config
      UnoCSS()
    ]
  };
});
export {
  vite_config_default as default
};
//# sourceMappingURL=data:application/json;base64,ewogICJ2ZXJzaW9uIjogMywKICAic291cmNlcyI6IFsic2NyaXB0cy9tYXRlcmlhbC1hZG1pbi1jb25maWcuY2pzIiwgInZpdGUuY29uZmlnLnRzIl0sCiAgInNvdXJjZXNDb250ZW50IjogWyJjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZGlybmFtZSA9IFwiL1VzZXJzL2xpemhpZmVuZy9semZfd29ya3NwYWNlL2Zsb3dlcl9taW5pL3NjcmlwdHNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfZmlsZW5hbWUgPSBcIi9Vc2Vycy9saXpoaWZlbmcvbHpmX3dvcmtzcGFjZS9mbG93ZXJfbWluaS9zY3JpcHRzL21hdGVyaWFsLWFkbWluLWNvbmZpZy5janNcIjtjb25zdCBfX3ZpdGVfaW5qZWN0ZWRfb3JpZ2luYWxfaW1wb3J0X21ldGFfdXJsID0gXCJmaWxlOi8vL1VzZXJzL2xpemhpZmVuZy9semZfd29ya3NwYWNlL2Zsb3dlcl9taW5pL3NjcmlwdHMvbWF0ZXJpYWwtYWRtaW4tY29uZmlnLmNqc1wiO2Z1bmN0aW9uIG1hdGVyaWFsQWRtaW5FbmFibGVkKGNvbW1hbmQsIG1vZGUsIHVuaU5vZGVFbnYpIHtcbiAgLy8gXHU1QzBGXHU3QTBCXHU1RThGIGRldiBcdTRGN0ZcdTc1MjggVml0ZSBidWlsZC93YXRjaFx1RkYxQnVuaSBDTEkgXHU3Njg0XHU3M0FGXHU1ODgzXHU2ODA3XHU4QkIwXHU1MzNBXHU1MjA2XHU4RkQwXHU4ODRDXHU1NDhDXHU1M0QxXHU4ODRDXHUzMDAyXG4gIGlmICh1bmlOb2RlRW52KSByZXR1cm4gdW5pTm9kZUVudiA9PT0gJ2RldmVsb3BtZW50JyAmJiBtb2RlICE9PSAncHJvZHVjdGlvbidcbiAgcmV0dXJuIGNvbW1hbmQgPT09ICdzZXJ2ZScgJiYgbW9kZSAhPT0gJ3Byb2R1Y3Rpb24nXG59XG5jb25zdCBzYW5pdGl6ZWRDb250ZXh0cyA9IG5ldyBXZWFrU2V0KClcbmZ1bmN0aW9uIGV4Y2x1ZGVNYXRlcmlhbEFkbWluKGNvbnRleHQpIHtcbiAgaWYgKHNhbml0aXplZENvbnRleHRzLmhhcyhjb250ZXh0KSkgcmV0dXJuXG4gIHNhbml0aXplZENvbnRleHRzLmFkZChjb250ZXh0KVxuICAvLyBcdTYzRDJcdTRFRjZcdTRGMUFcdTRGRERcdTc1NTlcdTY1RTcgcGFnZXMuanNvbiBcdTRFMkRcdTc2ODRcdTUyMDZcdTUzMDVcdUZGMUJcdTU3MjhcdTc1MUZcdTYyMTBcdTdFRDNcdTY3OUNcdTRFMkRcdTVCOUFcdTU0MTFcdTc5RkJcdTk2NjRcdTdCQTFcdTc0MDZcdTUyMDZcdTUzMDVcdTMwMDJcbiAgY29uc3QgZ2VuZXJhdGUgPSBjb250ZXh0LmdlbnJhdGVQYWdlc0pTT04uYmluZChjb250ZXh0KVxuICBjb250ZXh0LmdlbnJhdGVQYWdlc0pTT04gPSBhc3luYyAoKSA9PiB7XG4gICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgZ2VuZXJhdGUoKVxuICAgIHJlc3VsdC5zdWJQYWNrYWdlcyA9IChyZXN1bHQuc3ViUGFja2FnZXMgfHwgW10pLmZpbHRlcihpdGVtID0+ICFbXG4gICAgICAnc3VicGFja2FnZXMvbWF0ZXJpYWwtYWRtaW4nLFxuICAgICAgJ3N1YnBhY2thZ2VzL2RhaWx5LWZsb3dlci1hZG1pbicsXG4gICAgXS5pbmNsdWRlcyhpdGVtLnJvb3QpKVxuICAgIHJldHVybiByZXN1bHRcbiAgfVxufVxubW9kdWxlLmV4cG9ydHMgPSB7IG1hdGVyaWFsQWRtaW5FbmFibGVkLCBleGNsdWRlTWF0ZXJpYWxBZG1pbiB9XG4iLCAiY29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2Rpcm5hbWUgPSBcIi9Vc2Vycy9saXpoaWZlbmcvbHpmX3dvcmtzcGFjZS9mbG93ZXJfbWluaVwiO2NvbnN0IF9fdml0ZV9pbmplY3RlZF9vcmlnaW5hbF9maWxlbmFtZSA9IFwiL1VzZXJzL2xpemhpZmVuZy9semZfd29ya3NwYWNlL2Zsb3dlcl9taW5pL3ZpdGUuY29uZmlnLnRzXCI7Y29uc3QgX192aXRlX2luamVjdGVkX29yaWdpbmFsX2ltcG9ydF9tZXRhX3VybCA9IFwiZmlsZTovLy9Vc2Vycy9saXpoaWZlbmcvbHpmX3dvcmtzcGFjZS9mbG93ZXJfbWluaS92aXRlLmNvbmZpZy50c1wiO2ltcG9ydCBwYXRoIGZyb20gJ25vZGU6cGF0aCdcblxuaW1wb3J0IFVuaSBmcm9tICdAdW5pLWhlbHBlci9wbHVnaW4tdW5pJ1xuaW1wb3J0IFVuaUhlbHBlckNvbXBvbmVudHMgZnJvbSAnQHVuaS1oZWxwZXIvdml0ZS1wbHVnaW4tdW5pLWNvbXBvbmVudHMnXG5pbXBvcnQgVW5pSGVscGVyTGF5b3V0cyBmcm9tICdAdW5pLWhlbHBlci92aXRlLXBsdWdpbi11bmktbGF5b3V0cydcbmltcG9ydCBVbmlIZWxwZXJNYW5pZmVzdCBmcm9tICdAdW5pLWhlbHBlci92aXRlLXBsdWdpbi11bmktbWFuaWZlc3QnXG5pbXBvcnQgVW5pSGVscGVyUGFnZXMgZnJvbSAnQHVuaS1oZWxwZXIvdml0ZS1wbHVnaW4tdW5pLXBhZ2VzJ1xuaW1wb3J0IFVub0NTUyBmcm9tICd1bm9jc3Mvdml0ZSdcbmltcG9ydCBBdXRvSW1wb3J0IGZyb20gJ3VucGx1Z2luLWF1dG8taW1wb3J0L3ZpdGUnXG5pbXBvcnQgeyBkZWZpbmVDb25maWcgfSBmcm9tICd2aXRlJ1xuaW1wb3J0IFVuaVBvbHlmaWxsIGZyb20gJ3ZpdGUtcGx1Z2luLXVuaS1wb2x5ZmlsbCdcbmltcG9ydCB7IGV4Y2x1ZGVNYXRlcmlhbEFkbWluLCBtYXRlcmlhbEFkbWluRW5hYmxlZCB9IGZyb20gJy4vc2NyaXB0cy9tYXRlcmlhbC1hZG1pbi1jb25maWcuY2pzJ1xuXG5jb25zdCBiYXNlUGFnZUV4Y2x1ZGUgPSBbXG4gICcqKi9jb21wb25lbnRzLyoqJyxcbiAgJyoqL3VpLyoqJyxcbiAgJyoqL3BhcnRpYWxzLyoqJyxcbl1cblxuY29uc3QgcHJvZHVjdGlvblBhZ2VFeGNsdWRlID0gW1xuICAnKiovZGVidWcqLnZ1ZScsXG4gICcqKi90ZXN0Ki52dWUnLFxuXVxuXG4vLyBodHRwczovL3ZpdGVqcy5kZXYvY29uZmlnL1xuZXhwb3J0IGRlZmF1bHQgZGVmaW5lQ29uZmlnKCh7IGNvbW1hbmQsIG1vZGUgfSkgPT4ge1xuICBjb25zdCBpbmNsdWRlTWF0ZXJpYWxBZG1pbiA9IG1hdGVyaWFsQWRtaW5FbmFibGVkKGNvbW1hbmQsIG1vZGUsIHByb2Nlc3MuZW52LlVOSV9OT0RFX0VOViB8fCBwcm9jZXNzLmVudi5OT0RFX0VOVilcbiAgY29uc3QgcGFnZUV4Y2x1ZGUgPSBtb2RlID09PSAncHJvZHVjdGlvbidcbiAgICA/IFsuLi5iYXNlUGFnZUV4Y2x1ZGUsIC4uLnByb2R1Y3Rpb25QYWdlRXhjbHVkZV1cbiAgICA6IGJhc2VQYWdlRXhjbHVkZVxuXG4gIHJldHVybiB7XG4gICAgZGVmaW5lOiB7XG4gICAgICBfX01BVEVSSUFMX0FETUlOX186IEpTT04uc3RyaW5naWZ5KGluY2x1ZGVNYXRlcmlhbEFkbWluKSxcbiAgICAgIF9fREFJTFlfRkxPV0VSX0FETUlOX186IEpTT04uc3RyaW5naWZ5KGluY2x1ZGVNYXRlcmlhbEFkbWluKSxcbiAgICB9LFxuICAgIHJlc29sdmU6IHtcbiAgICAgIGFsaWFzOiB7XG4gICAgICAgICdAJzogcGF0aC5yZXNvbHZlKF9fZGlybmFtZSwgJ3NyYycpLFxuICAgICAgfSxcbiAgICB9LFxuICAgIGNzczoge1xuICAgICAgcHJlcHJvY2Vzc29yT3B0aW9uczoge1xuICAgICAgICBzY3NzOiB7XG4gICAgICAgICAgYWRkaXRpb25hbERhdGE6ICdAdXNlIFwiQC9zdHlsZXMvdmFyaWFibGVzLnNjc3NcIiBhcyAqOycsXG4gICAgICAgIH0sXG4gICAgICB9LFxuICAgIH0sXG4gICAgZXNidWlsZDoge1xuICAgICAgdGFyZ2V0OiAnZXMyMDE1JyxcbiAgICB9LFxuICAgIGJ1aWxkOiB7XG4gICAgICB0YXJnZXQ6ICdlczIwMTUnLFxuICAgIH0sXG4gICAgcGx1Z2luczogW1xuICAgICAgLy8gaHR0cHM6Ly91bmktaGVscGVyLmpzLm9yZy92aXRlLXBsdWdpbi11bmktbWFuaWZlc3RcbiAgICAgIFVuaUhlbHBlck1hbmlmZXN0KCksXG4gICAgICAvLyBodHRwczovL3VuaS1oZWxwZXIuanMub3JnL3ZpdGUtcGx1Z2luLXVuaS1wYWdlc1xuICAgICAgVW5pSGVscGVyUGFnZXMoe1xuICAgICAgICBkaXI6ICdzcmMvcGFnZXMnLCAvLyBcdUQ4M0RcdURDNDggXHU2NjBFXHU3ODZFXHU0RTNCXHU1MzA1XG4gICAgICAgIHN1YlBhY2thZ2VzOiBpbmNsdWRlTWF0ZXJpYWxBZG1pblxuICAgICAgICAgID8gWydzcmMvc3VicGFja2FnZXMvbWF0ZXJpYWwtYWRtaW4nLCAnc3JjL3N1YnBhY2thZ2VzL2RhaWx5LWZsb3dlci1hZG1pbiddXG4gICAgICAgICAgOiBbXSxcbiAgICAgICAgbWVyZ2VQYWdlczogdHJ1ZSxcbiAgICAgICAgb25CZWZvcmVXcml0ZUZpbGU6IGluY2x1ZGVNYXRlcmlhbEFkbWluID8gdW5kZWZpbmVkIDogZXhjbHVkZU1hdGVyaWFsQWRtaW4sXG4gICAgICAgIGR0czogJ3NyYy91bmktcGFnZXMuZC50cycsXG4gICAgICAgIC8vIFx1OTA3Rlx1NTE0RFx1NjI4QVx1OTg3NVx1OTc2Mlx1NTE4NVx1NzY4NFx1NUI1MFx1N0VDNFx1NEVGNlx1NUY1M1x1NjIxMFx1OTg3NVx1OTc2Mlx1NjI1M1x1NTMwNVxuICAgICAgICBleGNsdWRlOiBwYWdlRXhjbHVkZSxcbiAgICAgIH0pLFxuICAgICAgLy8gaHR0cHM6Ly91bmktaGVscGVyLmpzLm9yZy92aXRlLXBsdWdpbi11bmktbGF5b3V0c1xuICAgICAgVW5pSGVscGVyTGF5b3V0cygpLFxuICAgICAgLy8gaHR0cHM6Ly91bmktaGVscGVyLmpzLm9yZy92aXRlLXBsdWdpbi11bmktY29tcG9uZW50c1xuICAgICAgVW5pSGVscGVyQ29tcG9uZW50cyh7XG4gICAgICAgIGR0czogJ3NyYy9jb21wb25lbnRzLmQudHMnLFxuICAgICAgICBkaXJlY3RvcnlBc05hbWVzcGFjZTogZmFsc2UsXG4gICAgICAgIGNvbGxhcHNlU2FtZVByZWZpeGVzOiB0cnVlLFxuICAgICAgfSksXG4gICAgICAvLyBodHRwczovL3VuaS1oZWxwZXIuanMub3JnL3BsdWdpbi11bmlcbiAgICAgIFVuaSgpLFxuICAgICAgVW5pUG9seWZpbGwoKSxcbiAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9hbnRmdS91bnBsdWdpbi1hdXRvLWltcG9ydFxuICAgICAgQXV0b0ltcG9ydCh7XG4gICAgICAgIGltcG9ydHM6IFsndnVlJywgJ0B2dWV1c2UvY29yZScsICd1bmktYXBwJ10sXG4gICAgICAgIGR0czogJ3NyYy9hdXRvLWltcG9ydHMuZC50cycsXG4gICAgICAgIGRpcnM6IFsnc3JjL2NvbXBvc2FibGVzJywgJ3NyYy9zdG9yZXMnLCAnc3JjL3V0aWxzJ10sXG4gICAgICAgIHZ1ZVRlbXBsYXRlOiB0cnVlLFxuICAgICAgfSksXG4gICAgICAvLyBodHRwczovL2dpdGh1Yi5jb20vYW50ZnUvdW5vY3NzXG4gICAgICAvLyBzZWUgdW5vY3NzLmNvbmZpZy50cyBmb3IgY29uZmlnXG4gICAgICBVbm9DU1MoKSxcbiAgICBdLFxuICB9XG59KVxuIl0sCiAgIm1hcHBpbmdzIjogIjs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUE7QUFBQTtBQUFBO0FBQThWLGFBQVNBLHNCQUFxQixTQUFTLE1BQU0sWUFBWTtBQUVyWixVQUFJO0FBQVksZUFBTyxlQUFlLGlCQUFpQixTQUFTO0FBQ2hFLGFBQU8sWUFBWSxXQUFXLFNBQVM7QUFBQSxJQUN6QztBQUNBLFFBQU0sb0JBQW9CLG9CQUFJLFFBQVE7QUFDdEMsYUFBU0Msc0JBQXFCLFNBQVM7QUFDckMsVUFBSSxrQkFBa0IsSUFBSSxPQUFPO0FBQUc7QUFDcEMsd0JBQWtCLElBQUksT0FBTztBQUU3QixZQUFNLFdBQVcsUUFBUSxpQkFBaUIsS0FBSyxPQUFPO0FBQ3RELGNBQVEsbUJBQW1CLFlBQVk7QUFDckMsY0FBTSxTQUFTLE1BQU0sU0FBUztBQUM5QixlQUFPLGVBQWUsT0FBTyxlQUFlLENBQUMsR0FBRyxPQUFPLFVBQVEsQ0FBQztBQUFBLFVBQzlEO0FBQUEsVUFDQTtBQUFBLFFBQ0YsRUFBRSxTQUFTLEtBQUssSUFBSSxDQUFDO0FBQ3JCLGVBQU87QUFBQSxNQUNUO0FBQUEsSUFDRjtBQUNBLFdBQU8sVUFBVSxFQUFFLHNCQUFBRCx1QkFBc0Isc0JBQUFDLHNCQUFxQjtBQUFBO0FBQUE7OztBQ1Q5RCxtQ0FBMkQ7QUFYcVAsT0FBTyxVQUFVO0FBRWpVLE9BQU8sU0FBUztBQUNoQixPQUFPLHlCQUF5QjtBQUNoQyxPQUFPLHNCQUFzQjtBQUM3QixPQUFPLHVCQUF1QjtBQUM5QixPQUFPLG9CQUFvQjtBQUMzQixPQUFPLFlBQVk7QUFDbkIsT0FBTyxnQkFBZ0I7QUFDdkIsU0FBUyxvQkFBb0I7QUFDN0IsT0FBTyxpQkFBaUI7QUFWeEIsSUFBTSxtQ0FBbUM7QUFhekMsSUFBTSxrQkFBa0I7QUFBQSxFQUN0QjtBQUFBLEVBQ0E7QUFBQSxFQUNBO0FBQ0Y7QUFFQSxJQUFNLHdCQUF3QjtBQUFBLEVBQzVCO0FBQUEsRUFDQTtBQUNGO0FBR0EsSUFBTyxzQkFBUSxhQUFhLENBQUMsRUFBRSxTQUFTLEtBQUssTUFBTTtBQUNqRCxRQUFNLDJCQUF1QixtREFBcUIsU0FBUyxNQUFNLFFBQVEsSUFBSSxnQkFBZ0IsUUFBUSxJQUFJLFFBQVE7QUFDakgsUUFBTSxjQUFjLFNBQVMsZUFDekIsQ0FBQyxHQUFHLGlCQUFpQixHQUFHLHFCQUFxQixJQUM3QztBQUVKLFNBQU87QUFBQSxJQUNMLFFBQVE7QUFBQSxNQUNOLG9CQUFvQixLQUFLLFVBQVUsb0JBQW9CO0FBQUEsTUFDdkQsd0JBQXdCLEtBQUssVUFBVSxvQkFBb0I7QUFBQSxJQUM3RDtBQUFBLElBQ0EsU0FBUztBQUFBLE1BQ1AsT0FBTztBQUFBLFFBQ0wsS0FBSyxLQUFLLFFBQVEsa0NBQVcsS0FBSztBQUFBLE1BQ3BDO0FBQUEsSUFDRjtBQUFBLElBQ0EsS0FBSztBQUFBLE1BQ0gscUJBQXFCO0FBQUEsUUFDbkIsTUFBTTtBQUFBLFVBQ0osZ0JBQWdCO0FBQUEsUUFDbEI7QUFBQSxNQUNGO0FBQUEsSUFDRjtBQUFBLElBQ0EsU0FBUztBQUFBLE1BQ1AsUUFBUTtBQUFBLElBQ1Y7QUFBQSxJQUNBLE9BQU87QUFBQSxNQUNMLFFBQVE7QUFBQSxJQUNWO0FBQUEsSUFDQSxTQUFTO0FBQUE7QUFBQSxNQUVQLGtCQUFrQjtBQUFBO0FBQUEsTUFFbEIsZUFBZTtBQUFBLFFBQ2IsS0FBSztBQUFBO0FBQUEsUUFDTCxhQUFhLHVCQUNULENBQUMsa0NBQWtDLG9DQUFvQyxJQUN2RSxDQUFDO0FBQUEsUUFDTCxZQUFZO0FBQUEsUUFDWixtQkFBbUIsdUJBQXVCLFNBQVk7QUFBQSxRQUN0RCxLQUFLO0FBQUE7QUFBQSxRQUVMLFNBQVM7QUFBQSxNQUNYLENBQUM7QUFBQTtBQUFBLE1BRUQsaUJBQWlCO0FBQUE7QUFBQSxNQUVqQixvQkFBb0I7QUFBQSxRQUNsQixLQUFLO0FBQUEsUUFDTCxzQkFBc0I7QUFBQSxRQUN0QixzQkFBc0I7QUFBQSxNQUN4QixDQUFDO0FBQUE7QUFBQSxNQUVELElBQUk7QUFBQSxNQUNKLFlBQVk7QUFBQTtBQUFBLE1BRVosV0FBVztBQUFBLFFBQ1QsU0FBUyxDQUFDLE9BQU8sZ0JBQWdCLFNBQVM7QUFBQSxRQUMxQyxLQUFLO0FBQUEsUUFDTCxNQUFNLENBQUMsbUJBQW1CLGNBQWMsV0FBVztBQUFBLFFBQ25ELGFBQWE7QUFBQSxNQUNmLENBQUM7QUFBQTtBQUFBO0FBQUEsTUFHRCxPQUFPO0FBQUEsSUFDVDtBQUFBLEVBQ0Y7QUFDRixDQUFDOyIsCiAgIm5hbWVzIjogWyJtYXRlcmlhbEFkbWluRW5hYmxlZCIsICJleGNsdWRlTWF0ZXJpYWxBZG1pbiJdCn0K
