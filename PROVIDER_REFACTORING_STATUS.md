# Provider Refactoring Status

This document tracks the progress of refactoring the danmaku provider configuration system from a hardcoded list to a dynamic system.

## ✅ Completed

### 1. Schema and Types (`packages/danmaku-anywhere/src/common/options/providerConfig/`)
- ✅ Created `schema.ts` with provider configuration types
- ✅ Created `constant.ts` with default providers and factory functions  
- ✅ Created `service.ts` with CRUD operations for provider configs
- ✅ Created `useProviderConfig.ts` with React hooks for provider management

### 2. Data Schema Updates
- ✅ Updated `packages/danmaku-converter/src/canonical/episode/v4/schema.ts` to store `providerInstanceId`
- ✅ Updated `packages/danmaku-converter/src/canonical/season/v1/schema.ts` to store `providerInstanceId`

### 3. API Layer Updates (`packages/danmaku-provider/src/providers/ddp/api.ts`)
- ✅ Created `DanDanPlayProviderContext` interface
- ✅ Updated `fetchDanDanPlay` to accept context parameter
- ✅ Updated all exported API functions to accept optional context

### 4. Service Layer Updates (`packages/danmaku-anywhere/src/background/services/DanDanPlayService.ts`)
- ✅ Added provider parameter to all methods
- ✅ Created `createContext()` helper method
- ✅ Updated methods to pass provider context to API calls
- ✅ Updated methods to store providerInstanceId in database records

### 5. UI Components (`packages/danmaku-anywhere/src/popup/pages/providers/`)
- ✅ Created `components/ProviderConfigList.tsx` - drag-and-drop list
- ✅ Created `components/ProviderToggleSwitch.tsx` - enable/disable toggle
- ✅ Created `components/ProviderToolbar.tsx` - add button with dropdown
- ✅ Created `components/ConfirmDeleteDialog.tsx` - delete confirmation
- ✅ Created `pages/ProvidersPage.tsx` - main provider management page
- ✅ Created `pages/ProviderEditor.tsx` - add/edit form for providers
- ✅ Updated `src/popup/store.ts` with provider state management

### 6. Provider Context Service (`packages/danmaku-anywhere/src/common/options/context/`)
- ✅ Created `schema.ts` with provider context schema
- ✅ Created `service.ts` with context management (backed by local storage)
- ✅ Updated `DanDanPlayService` to read from context service instead of parameters
- ✅ Services now get provider config from context automatically

## 🚧 Remaining Work

### 7. Routing and Navigation
- ⏳ Add provider routes to router configuration
- ⏳ Add "Providers" tab to main navigation
- ⏳ Remove old "Danmaku Source" options page

### 8. Migration and Compatibility
- ⏳ Create migration logic in extension options to:
  - Move existing `danmakuSources.dandanplay.baseUrl` and `useCustomRoot` to custom providers
  - Keep built-in provider settings
  - Generate UUIDs for migrated custom providers
- ⏳ Update `extensionOptionsSchema` to remove old `danmakuSources` field
- ⏳ Update existing code that references old schema

### 9. Integration Points
- ⏳ Update search/fetch flows to:
  - Set provider context before calling service methods
  - Use `providerContextService.setProvider()` when user selects a provider
  - Clear context after operations complete (optional)
  - Handle multiple dandanplay-compatible providers

### 10. Localization
- ⏳ Add translation keys for:
  - `providers.add` - "Add Provider"
  - `providers.builtin` - "Built-in"
  - `providers.type.custom-dandanplay` - "DanDanPlay Compatible"
  - `providers.type.custom-maccms` - "MacCMS"
  - `providers.delete.title` - "Delete Provider"
  - `providers.delete.message` - "Are you sure you want to delete {name}?"
  - `providers.alert.deleted` - "Provider deleted"
  - `providers.alert.created` - "Provider created"
  - `providers.alert.updated` - "Provider updated"
  - Various field labels and help text

### 11. Testing and Validation
- ⏳ Test provider CRUD operations
- ⏳ Test drag-and-drop reordering
- ⏳ Test provider enable/disable functionality
- ⏳ Test API calls with different provider contexts
- ⏳ Test migration from old schema to new schema
- ⏳ Test that built-in providers cannot be deleted
- ⏳ Test that custom providers can be added/edited/deleted

## Key Design Decisions

1. **Provider Instance ID**: Stored in episode/season `providerIds` as `providerInstanceId` (optional for backwards compatibility)

2. **Built-in vs Custom Providers**:
   - Built-in: `id` is fixed string (e.g., 'builtin-dandanplay'), cannot be deleted
   - Custom: `id` is UUID, can be deleted

3. **Provider Context Service**: 
   - Uses extension local storage to store current provider context
   - When a search/fetch is initiated, code sets provider context via `providerContextService.setProvider()`
   - Services (DanDanPlayService, etc.) read from context service to get current provider
   - Eliminates need to thread provider parameter through all method calls

4. **API Context**: Provider config passed as optional `context` parameter to all API functions, allowing backward compatibility

5. **Service Layer**: Services get provider from context service automatically via `getCurrentProvider()` method

6. **UI Pattern**: Follows same pattern as mount configs with drag-and-drop list and separate editor

## Migration Path

### For Existing Users:
1. Extension options migration will run on next load
2. If user has custom `baseUrl` in dandanplay options:
   - Create new custom dandanplay-compatible provider
   - Copy `baseUrl` and `chConvert` settings
   - Keep built-in dandanplay provider enabled
3. Existing episodes/seasons without `providerInstanceId`:
   - Still work (field is optional)
   - Will get `providerInstanceId` on next update

### For New Users:
- Start with 3 built-in providers (DanDanPlay, Bilibili, Tencent)
- Can add custom providers as needed

## Next Steps

Priority order for completing remaining work:

1. **Create ProviderEditor component** - Core functionality
2. **Add routing** - Make pages accessible
3. **Add localization** - Make UI usable
4. **Migration logic** - Handle existing users
5. **Update callsites** - Make everything work together
6. **Testing** - Ensure stability
