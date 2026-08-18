param location string
param name string
param existingResourceId string = ''
param workloadPrincipalId string = ''
param tags object = {}

var reuse = !empty(existingResourceId)
var existingParts = split(existingResourceId, '/')
var blobContributorRole = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', 'ba92f5b4-2d11-453d-a403-e96b0029c9fe')

resource created 'Microsoft.Storage/storageAccounts@2023-05-01' = if (!reuse) {
  name: name
  location: location
  tags: tags
  sku: { name: 'Standard_LRS' }
  kind: 'StorageV2'
  properties: {
    accessTier: 'Hot'
    allowBlobPublicAccess: false
    allowSharedKeyAccess: false
    defaultToOAuthAuthentication: true
    minimumTlsVersion: 'TLS1_2'
    supportsHttpsTrafficOnly: true
    publicNetworkAccess: 'Enabled'
  }
}

resource existing 'Microsoft.Storage/storageAccounts@2023-05-01' existing = if (reuse) {
  name: last(existingParts)
  scope: resourceGroup(existingParts[2], existingParts[4])
}

resource blobService 'Microsoft.Storage/storageAccounts/blobServices@2023-05-01' = if (!reuse) {
  parent: created
  name: 'default'
  properties: {
    deleteRetentionPolicy: { enabled: true, days: 7 }
    containerDeleteRetentionPolicy: { enabled: true, days: 7 }
    isVersioningEnabled: true
  }
}

resource dataContainer 'Microsoft.Storage/storageAccounts/blobServices/containers@2023-05-01' = if (!reuse) {
  parent: blobService
  name: 'dora-data'
  properties: { publicAccess: 'None' }
}

resource createdRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (!reuse && !empty(workloadPrincipalId)) {
  name: guid(created.id, workloadPrincipalId, blobContributorRole)
  scope: created
  properties: {
    principalId: workloadPrincipalId
    principalType: 'ServicePrincipal'
    roleDefinitionId: blobContributorRole
  }
}

var resourceId = reuse ? existing!.id : created!.id
output resourceId string = resourceId
output blobEndpoint string = reuse
  ? reference(existingResourceId, '2023-05-01').primaryEndpoints.blob
  : created!.properties.primaryEndpoints.blob
output reused bool = reuse
output existingResourceRequiresRbac bool = reuse && !empty(workloadPrincipalId)
