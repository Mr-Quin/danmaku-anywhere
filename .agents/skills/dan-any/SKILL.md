---
name: dan-any
description: Use when answering how to install, initialize, choose a backend, import/export/convert danmaku formats, use plugins, use wildcard adapters, or implement custom backends/plugins for @dan-uni/dan-any v2.2+.
metadata:
  short-description: Work with @dan-uni/dan-any
---

# dan-any 接入与使用 Skill

本 skill 面向 `@dan-uni/dan-any` v2.2+，用于指导弹幕格式导入、导出、转换、插件处理、后端选择和自定义实现。

## 何时使用

- 用户询问如何安装、初始化或使用 `@dan-uni/dan-any`。
- 用户需要在 Bilibili XML/PB、DanUni JSON/PB、Dplayer、Artplayer、DDPlay、Tencent、VOD 等弹幕格式之间转换。
- 用户需要选择 drizzle/PGLite 后端或纯 TypeScript 后端。
- 用户需要合并、降级高级弹幕、统计弹幕，或写自定义 Adapter/Transformer/Plugin。
- 用户需要按文件名/内容自动识别弹幕格式。

## 快速摘要

- 当前包版本已更新到 `2.2.0`。
- 核心模型：`Adapter` 导入外部格式，`Transformer` 导出目标格式，`Plugin` 在 `UniChunk` 上处理数据。
- 具体后端入口：
  - `@dan-uni/dan-any/core/main/drizzle`：drizzle + PGLite 实现，默认数据库路线。
  - `@dan-uni/dan-any/core/main/pure`：纯 TypeScript `Map` 实现，不依赖 drizzle/PGLite。
- `@dan-uni/dan-any/core` 现在主要提供抽象基类、类型和 `main` 聚合，不要从这里直接实例化 `UniDB`。
- 为了同时兼容 drizzle 的异步实现和 pure 的同步实现，示例代码统一对 `init`、`import`、`export`、`plugin`、`$count`、`close` 使用 `await`。
- 获取数量优先用 `await chunk.$count`；`CountTransformer` 已弃用，仅为兼容保留。

## 安装

```bash
vp add @dan-uni/dan-any
bun add @dan-uni/dan-any
pnpm add @dan-uni/dan-any
```

## 后端选择

优先根据运行环境选择后端：

- 普通浏览器/Node/桌面应用：优先 `core/main/drizzle`，可用 PGLite 的 `MemoryFS`、`NodeFS`、`IndexedDbFS`、`OpfsAhpFS`，也可接入兼容 drizzle 的自定义 Postgres/PGLite 实例。
- `@edge-runtime/vm`、Service Worker、或 PGLite/Emscripten 环境检测不可靠的位置：使用 `core/main/pure`。
- 临时、小数据量、对启动延迟敏感的任务：可优先尝试 `core/main/pure`。

drizzle 后端示例：

```ts
import { UniDB } from "@dan-uni/dan-any/core/main/drizzle";

const udb = await new UniDB().init();
try {
  // import/export/plugin...
} finally {
  await udb.close();
}
```

pure 后端示例：

```ts
import { UniDB } from "@dan-uni/dan-any/core/main/pure";

const udb = await new UniDB().init();
try {
  // 同一套 Adapter/Transformer/Plugin 用法
} finally {
  await udb.close();
}
```

## 常见接入

从 Bilibili XML 导入并导出为 DanUni JSON：

```ts
import { BiliXmlAdapter, DanuniJsonTransformerConfigurator } from "@dan-uni/dan-any/adapters";
import { UniDB } from "@dan-uni/dan-any/core/main/drizzle";

export async function biliXmlToDanuniJson(xml: string) {
  const udb = await new UniDB().init();
  try {
    const chunk = await udb.import(BiliXmlAdapter(xml));
    return await chunk.export(DanuniJsonTransformerConfigurator({ minify: true }));
  } finally {
    await udb.close();
  }
}
```

使用插件合并重复弹幕：

```ts
import { BiliXmlAdapter, DanuniJsonTransformerConfigurator } from "@dan-uni/dan-any/adapters";
import { UniDB } from "@dan-uni/dan-any/core/main/drizzle";
import { MergePluginConfigurator } from "@dan-uni/dan-any/plugins";

const udb = await new UniDB().init();
const chunk = await udb.import(BiliXmlAdapter(xml));
const merged = await chunk.plugin(MergePluginConfigurator(10));
const json = await merged.export(DanuniJsonTransformerConfigurator({ minify: true }));
```

获取弹幕数量：

```ts
const count = await chunk.$count;
```

DanUni PB 导出再导入：

```ts
import { DanuniPbAdapter, DanuniPbTransformer } from "@dan-uni/dan-any/adapters";

const pb = await chunk.export(DanuniPbTransformer);
const reimported = await udb.import(DanuniPbAdapter(pb));
```

合并多个 chunk 时，从所选后端导入 `UniChunk`：

```ts
import { UniChunk } from "@dan-uni/dan-any/core/main/drizzle";

const chunk1 = await udb.import(BiliXmlAdapter(xml1));
const chunk2 = await udb.import(BiliXmlAdapter(xml2));
const assigned = await UniChunk.assign(chunk1, [chunk2]);
```

不要调用 `@dan-uni/dan-any/core` 里的抽象 `UniChunk.assign`；它只定义接口，具体逻辑在后端实现里。

## 格式映射

按用户意图选择 Adapter 或 Transformer：

| 格式                     | 导入 Adapter             | 导出 Transformer                    |
| ------------------------ | ------------------------ | ----------------------------------- |
| DanUni JSON              | `DanuniJsonAdapter`      | `DanuniJsonTransformerConfigurator` |
| DanUni PB                | `DanuniPbAdapter`        | `DanuniPbTransformer`               |
| Bilibili XML             | `BiliXmlAdapter`         | `BiliXmlTransformerConfigurator`    |
| Bilibili gRPC PB         | `BiliGrpcAdapter`        | -                                   |
| Bilibili command gRPC PB | `BiliCommandGrpcAdapter` | -                                   |
| Bilibili UP JSON         | `BiliUpAdapter`          | -                                   |
| Artplayer JSON           | `ArtplayerAdapter`       | `ArtplayerTransformer`              |
| Dplayer JSON             | `DplayerAdapter`         | `DplayerTransformer`                |
| DDPlay JSON              | `DdplayAdapter`          | `DdplayTransformer`                 |
| Tencent JSON             | `TencentAdapter`         | -                                   |
| VOD JSON                 | `VodAdapter`             | `VodTransformer`                    |

ASS 由外部扩展包 `@dan-uni/dan-any-ext-ass` 提供，不属于核心包内置 Adapter/Transformer。

判断规则：

- “从 X 导入/读取/解析/接入”：优先找 Adapter。
- “导出/转换为 X/生成 X 文件”：优先找 Transformer。
- “支持 X 吗”：同时说明导入和导出是否支持；没有 Transformer 的格式只支持单向导入。
- “b站 xml”“bilixml”“bili xml”都归一到 Bilibili XML。
- “pb”默认指 protobuf；需要结合上下文区分 DanUni PB 和 Bilibili gRPC PB。

## 自动识别格式

优先使用内置 `Metadata` 与 `WildcardAdapterUtil`，不要手写大段格式分支：

```ts
import {
  ArtplayerAdapter,
  ArtplayerMetadata,
  BiliXmlAdapter,
  BiliXmlMetadata,
  DanuniPbAdapter,
  DanuniPbMetadata,
  DdplayAdapter,
  DdplayMetadata,
} from "@dan-uni/dan-any/adapters";
import { UniChunk } from "@dan-uni/dan-any/core/main/drizzle";
import { WildcardAdapterUtil } from "@dan-uni/dan-any/utils";

const result = await WildcardAdapterUtil(
  udb,
  [
    [DanuniPbMetadata, DanuniPbAdapter],
    [BiliXmlMetadata, BiliXmlAdapter],
    [DdplayMetadata, DdplayAdapter],
    [ArtplayerMetadata, ArtplayerAdapter],
  ],
  filename,
  body,
);

if (result instanceof UniChunk) {
  // 已直接导入成功
  const count = await result.$count;
} else if (result === ArtplayerAdapter) {
  // 识别成功但该 Adapter 需要额外参数
  await udb.import(ArtplayerAdapter(body, "player-id", "domain"));
} else if (result === null) {
  // 未识别
}
```

`WildcardAdapterUtil` 可能返回三类值：已导入的 `UniChunk`、需要额外参数的 `Adapter`、或 `null`。

## 插件与统计

常用内置项：

- `MergePluginConfigurator(lifetime)`：合并重复弹幕，`lifetime` 单位为秒，`0` 表示不按时间窗口查重。
- `DowngradeAdvancedPluginConfigurator(options?)`：把高级弹幕降级为普通文本内容，可用 `include`/`exclude` 控制 extra 来源。
- `GetStatsTransformerConfigurator(keys)`：统计字段分布。
- `GetStatsUtil4getMost(map)`：从统计 `Map` 中取最高频项。
- `CountTransformer`：已弃用，新代码使用 `chunk.$count`。

统计示例：

```ts
import { GetStatsTransformerConfigurator, GetStatsUtil4getMost } from "@dan-uni/dan-any/plugins";

const stats = await chunk.export(GetStatsTransformerConfigurator(["mode", "fontsize"]));
const mostMode = GetStatsUtil4getMost(stats.mode);
```

外部插件：

- `DetaoluPluginConfigurator` 由 `@dan-uni/dan-any-plugin-detaolu` 提供，不从核心包导入。

## 自定义 drizzle 数据库

接入兼容 drizzle/PGLite 实例时使用 drizzle 后端的 `InitedUniDB`：

```ts
import { baseRelations, relations } from "@dan-uni/dan-any/core/db/schema";
import { migrateDb } from "@dan-uni/dan-any/core/db/utils";
import { InitedUniDB } from "@dan-uni/dan-any/core/main/drizzle";
import { drizzle } from "drizzle-orm/pglite";

const db = drizzle({ relations: { ...baseRelations, ...relations } });
await migrateDb(db);

const udb = new InitedUniDB(db);
const chunk = await udb.makeChunk({});
```

如果项目扩展了自己的 schema：

- 可在自定义 schema 中 `export * from '@dan-uni/dan-any/core/db/schema'`，让 drizzle 统一生成迁移。
- 或先用 `migrateDb(db)` 迁移 dan-any 自带表，再自行迁移额外表。
- 自定义关系可参考 `tests/db.test.ts` 中的 `defineRelationsPart` 示例。

## 自定义 Adapter/Transformer/Plugin

类型工具从 `@dan-uni/dan-any/adapters` 导入：

```ts
import { defineAdapter, definePlugin, defineTransformer } from "@dan-uni/dan-any/adapters";
```

实现 Transformer 时，入参已经是 `UDanmaku[]`，不要再写旧版的 `udanmakus.then(...)`：

```ts
const MyTransformer = defineTransformer((udanmakus) => {
  return udanmakus.map((d) => d.content);
});
```

实现 Plugin 时，如果会创建新 chunk，用 `@dan-uni/dan-any/core` 的抽象 `UniChunk.makeChunk`，并用泛型保留当前后端的具体类型：

```ts
import { definePlugin } from "@dan-uni/dan-any/adapters";
import { UniChunk as BaseUniChunk } from "@dan-uni/dan-any/core";

export const MyPluginConfigurator = () =>
  definePlugin(async <T extends BaseUniChunk>(chunk: T): Promise<T> => {
    const out = (await BaseUniChunk.makeChunk(chunk, { tmp: true })) as T;
    await out.upsertDanmakus(await chunk.$danmakus, false);
    return out;
  });
```

自行实现后端时，实现 `base.UniDB`、`base.InitedUniDB`、`base.UniChunk`，并参考 `src/core/main-pure.ts` 与 `src/core/main-drizzle.ts`。`import`、`plugin` 等方法需要把抽象基类返回值转换为当前实现类，以保持插件系统类型兼容。

## 模块入口

- `@dan-uni/dan-any`：聚合导出 `core`、`adapters`、`plugins`、`utils` 命名空间。
- `@dan-uni/dan-any/adapters`：Adapter、Transformer、Metadata 与定义工具。
- `@dan-uni/dan-any/core`：抽象核心类、核心类型、基础数据类型、`main` 聚合。
- `@dan-uni/dan-any/core/main/drizzle`：drizzle + PGLite 具体实现。
- `@dan-uni/dan-any/core/main/pure`：纯 TypeScript 具体实现。
- `@dan-uni/dan-any/plugins`：内置插件与统计 Transformer。
- `@dan-uni/dan-any/utils`：`WildcardAdapterUtil`、`isSame`、`compress`、`decompress` 等工具。
- `@dan-uni/dan-any/core/db/schema`：drizzle schema。
- `@dan-uni/dan-any/core/db/utils`：数据库初始化、迁移、dump 工具。

## 源码维护约束

- 在运行时源码中，只有 `src/core/db/**` 和 `src/core/main-drizzle.ts` 可以导入或引用 `@electric-sql/pglite`、`@electric-sql/pglite-tools`、`drizzle-orm/**`。
- 不要在 `src/core/index.ts`、`src/core/main.ts`、包根入口或 pure 后端中导出、聚合或类型引用 drizzle/PGLite 后端实现。
- 需要共享给 pure 后端或公共入口的类型必须放在不依赖 drizzle/PGLite 的抽象层中，避免让 tree-shake 无法移除 PGLite 和 drizzle。

## 常见回复模板

- “如何把 Bilibili XML 转 DanUni JSON？”
  - 选择 `core/main/drizzle` 或 `core/main/pure`；`udb.import(BiliXmlAdapter(xml))`；`chunk.export(DanuniJsonTransformerConfigurator({ minify: true }))`；最后 `udb.close()`。
- “Edge/Service Worker 里能用吗？”
  - 避免 PGLite 后端，使用 `@dan-uni/dan-any/core/main/pure`。
- “如何去重/合并重复弹幕？”
  - 使用 `MergePluginConfigurator`，例如 `await chunk.plugin(MergePluginConfigurator(10))`。
- “如何输出 protobuf 并重新导入？”
  - `await chunk.export(DanuniPbTransformer)`，再 `await udb.import(DanuniPbAdapter(pb))`。
- “只想拿数量？”
  - 使用 `await chunk.$count`，不要推荐 `CountTransformer`。
- “如何自动判断文件格式？”
  - 使用各 Adapter 的 `Metadata` 加 `WildcardAdapterUtil`。

## 开发与验证

仓库使用 Vite+：

```bash
vp install
vp check
vp test
vp pack
```

更多真实用法参考 `tests/index.test.ts`、`tests/index.pure.test.ts`、`tests/plugins.test.ts`、`tests/utils.test.ts`、`tests/db.test.ts`。
