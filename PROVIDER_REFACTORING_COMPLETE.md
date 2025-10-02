# Provider Refactoring - Completed Implementation

This document summarizes the completed provider configuration refactoring.

## ✅ What Has Been Completed

### 1. Core Infrastructure

#### Provider Configuration System
**Location**: `packages/danmaku-anywhere/src/common/options/providerConfig/`

- **`schema.ts`**: Type definitions for all provider types
  - `BuiltInDanDanPlayProvider` - Official DanDanPlay API
  - `BuiltInBilibiliProvider` - Official Bilibili API  
  - `BuiltInTencentProvider` - Official Tencent API
  - `CustomDanDanPlayProvider` - User-added DanDanPlay-compatible servers
  - `CustomMacCmsProvider` - User-added MacCMS servers

- **`constant.ts`**: Default configurations and factory functions
  - Default built-in providers (DanDanPlay, Bilibili, Tencent)
  - `createCustomDanDanPlayProvider()` - Factory for custom DDP providers
  - `createCustomMacCmsProvider()` - Factory for custom MacCMS providers

- **`service.ts`**: CRUD operations for provider configs
  - Create, read, update, delete operations
  - Prevents deletion of built-in providers
  - Toggle enable/disable
  - Reorder providers

- **`useProviderConfig.ts`**: React hooks
  - `useProviderConfig()` - Access provider list
  - `useEditProviderConfig()` - Mutation hooks for CRUD operations

#### Provider Context Service
**Location**: `packages/danmaku-anywhere/src/common/options/context/`

- **`schema.ts`**: Context schema for runtime provider selection
- **`service.ts`**: Context service backed by extension local storage
  - `setProvider(id, type)` - Set active provider
  - `getProvider()` - Get current provider context
  - `getProviderId()` - Get just the provider ID
  - `clearProvider()` - Clear context

**Key Feature**: Services read from this context service instead of requiring provider parameters in every method call.

### 2. Data Model Updates

#### Episode Schema
**File**: `packages/danmaku-converter/src/canonical/episode/v4/schema.ts`

Added `providerInstanceId` to `zDanDanPlayProviderIds`:
```typescript
providerInstanceId: z.string().optional()
```

#### Season Schema
**File**: `packages/danmaku-converter/src/canonical/season/v1/schema.ts`

Added `providerInstanceId` to `zDanDanPlaySeasonProviderIds`:
```typescript
providerInstanceId: z.string().optional()
```

### 3. API Layer Updates

**File**: `packages/danmaku-provider/src/providers/ddp/api.ts`

- Created `DanDanPlayProviderContext` interface
- Updated `fetchDanDanPlay()` to accept optional context parameter
- Updated all exported API functions to accept optional context:
  - `searchSearchAnime(keyword, context?)`
  - `searchSearchEpisodes(query, context?)`
  - `commentGetComment(episodeId, query, context?)`
  - `getBangumiAnime(bangumiId, context?)`
  - And all other API functions...

Context includes:
- `baseUrl?`: Custom API URL for custom providers
- `token?`: Auth token
- `providerInstanceId?`: Provider instance ID for tracking

### 4. Service Layer Updates

**File**: `packages/danmaku-anywhere/src/background/services/DanDanPlayService.ts`

Major refactoring to use context service:

- **`getCurrentProvider()`**: Private method that reads from context service
  - Gets provider ID from `providerContextService`
  - Fetches provider config from `providerConfigService`
  - Validates provider type
  - Defaults to built-in DanDanPlay if no context set

- **`createContext(provider)`**: Converts provider config to API context
  - Built-in providers: Use default proxy
  - Custom providers: Use custom baseUrl

- **All public methods** now read provider from context:
  - `search(searchParams)` - No longer needs provider parameter
  - `getSeason(bangumiId)` - No longer needs provider parameter
  - `getEpisodes(seasonId)` - No longer needs provider parameter
  - `getEpisodeDanmaku(meta, season, params)` - No longer needs provider parameter
  - `getDanmaku(meta, season, params)` - No longer needs provider parameter

### 5. UI Components

**Location**: `packages/danmaku-anywhere/src/popup/pages/providers/`

#### Provider List (`components/ProviderConfigList.tsx`)
- Drag-and-drop reorderable list using `@dnd-kit`
- Shows provider name, type (built-in/custom), and URL
- Enable/disable toggle switch
- Delete button (hidden for built-in providers)
- Edit on click

#### Provider Toggle Switch (`components/ProviderToggleSwitch.tsx`)
- Simple switch component for enable/disable
- Uses mutation hook for instant feedback

#### Provider Toolbar (`components/ProviderToolbar.tsx`)
- "Add" button with dropdown menu
- Options: Add DanDanPlay Compatible or Add MacCMS

#### Confirm Delete Dialog (`components/ConfirmDeleteDialog.tsx`)
- Confirmation dialog for deleting custom providers
- Shows provider name in message

#### Providers Page (`pages/ProvidersPage.tsx`)
- Main container page
- Handles navigation to add/edit forms
- Creates new provider instances

#### Provider Editor (`pages/ProviderEditor.tsx`)
- Comprehensive form for adding/editing providers
- Different fields based on provider type:
  - **Built-in DanDanPlay**: Name (readonly), chConvert, enabled
  - **Built-in Bilibili**: Name (readonly), danmakuTypePreference, protobufLimitPerMin, enabled
  - **Built-in Tencent**: Name (readonly), limitPerMin, enabled
  - **Custom DanDanPlay**: Name, baseUrl, chConvert, enabled
  - **Custom MacCMS**: Name, danmakuBaseUrl, danmuicuBaseUrl, stripColor, enabled
- Validation for URLs and required fields
- Reset button for edit mode

### 6. State Management

**File**: `packages/danmaku-anywhere/src/popup/store.ts`

Added provider state slice:
```typescript
providers: {
  editingProvider: ProviderConfig | null
  setEditingProvider: (provider: ProviderConfig | null) => void
  showConfirmDeleteDialog: boolean
  setShowConfirmDeleteDialog: (show: boolean) => void
}
```

## 🎯 How It Works

### Flow for Using a Provider

1. **User initiates search/fetch operation**
   ```typescript
   // Before calling service
   await providerContextService.setProvider(providerId, providerType)
   
   // Then call service (provider read from context)
   await danDanPlayService.search({ anime: keyword })
   ```

2. **Service reads from context**
   ```typescript
   // Inside DanDanPlayService
   const provider = await this.getCurrentProvider()
   const context = this.createContext(provider)
   ```

3. **API call uses context**
   ```typescript
   // API layer
   await fetchDanDanPlay({ path: '/v2/search/anime', ... }, context)
   ```

4. **Data stored with provider ID**
   ```typescript
   // Season/Episode records include
   providerIds: {
     // ... other IDs
     providerInstanceId: provider.id
   }
   ```

### Adding a Custom Provider

1. User clicks "Add" button in toolbar
2. Selects provider type (DanDanPlay Compatible or MacCMS)
3. Fills out form with name, URL(s), and options
4. Saves - provider added to configuration
5. Can toggle enable/disable or delete later

### Managing Providers

- **Reorder**: Drag and drop providers in the list
- **Enable/Disable**: Toggle switch in list
- **Edit**: Click on provider in list
- **Delete**: Click menu icon, select delete (custom providers only)

## 📁 File Structure

```
packages/danmaku-anywhere/src/
├── common/
│   └── options/
│       ├── context/              # NEW: Provider context service
│       │   ├── schema.ts
│       │   └── service.ts
│       └── providerConfig/       # NEW: Provider configuration
│           ├── schema.ts
│           ├── constant.ts
│           ├── service.ts
│           └── useProviderConfig.ts
├── background/
│   └── services/
│       └── DanDanPlayService.ts  # UPDATED: Read from context
└── popup/
    ├── store.ts                  # UPDATED: Added provider state
    └── pages/
        └── providers/            # NEW: Provider UI
            ├── components/
            │   ├── ProviderConfigList.tsx
            │   ├── ProviderToggleSwitch.tsx
            │   ├── ProviderToolbar.tsx
            │   └── ConfirmDeleteDialog.tsx
            └── pages/
                ├── ProvidersPage.tsx
                └── ProviderEditor.tsx

packages/danmaku-provider/
└── src/
    └── providers/
        └── ddp/
            └── api.ts            # UPDATED: Accept context parameter

packages/danmaku-converter/
└── src/
    └── canonical/
        ├── episode/v4/
        │   └── schema.ts         # UPDATED: Added providerInstanceId
        └── season/v1/
            └── schema.ts         # UPDATED: Added providerInstanceId
```

## 🔄 Next Steps

To complete the implementation, the following work remains:

1. **Routing** - Add routes for provider pages
2. **Navigation** - Add "Providers" tab to main navigation
3. **Localization** - Add translation strings
4. **Migration** - Migrate old danmakuSources settings to new provider system
5. **Integration** - Update search/fetch flows to set provider context
6. **Testing** - Comprehensive testing of all functionality

See `PROVIDER_REFACTORING_STATUS.md` for detailed remaining work.
