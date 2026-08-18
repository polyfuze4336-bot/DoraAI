param location string
param name string
param existingResourceId string = ''
param workloadPrincipalId string = ''
param tags object = {}

var reuse = !empty(existingResourceId)
var existingParts = split(existingResourceId, '/')
var secretsUserRole = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '4633458b-17de-408a-b874-0445c86b69e6')

resource created 'Microsoft.KeyVault/vaults@2023-07-01' = if (!reuse) {
  name: name
  location: location
  tags: tags
  properties: {
    tenantId: tenant().tenantId
    enableRbacAuthorization: true
    enablePurgeProtection: true
    enableSoftDelete: true
    softDeleteRetentionInDays: 7
    publicNetworkAccess: 'Enabled'
    sku: { family: 'A', name: 'standard' }
  }
}

resource existing 'Microsoft.KeyVault/vaults@2023-07-01' existing = if (reuse) {
  name: last(existingParts)
  scope: resourceGroup(existingParts[2], existingParts[4])
}

resource createdRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (!reuse && !empty(workloadPrincipalId)) {
  name: guid(created.id, workloadPrincipalId, secretsUserRole)
  scope: created
  properties: { principalId: workloadPrincipalId, principalType: 'ServicePrincipal', roleDefinitionId: secretsUserRole }
}
output resourceId string = reuse ? existing!.id : created!.id
output name string = reuse ? existing!.name : created!.name
output vaultUri string = reuse
  ? reference(existingResourceId, '2023-07-01').properties.vaultUri
  : created!.properties.vaultUri
output reused bool = reuse
output existingResourceRequiresRbac bool = reuse && !empty(workloadPrincipalId)
