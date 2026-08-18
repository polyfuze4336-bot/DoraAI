param location string
param name string
param existingResourceId string = ''
param workloadPrincipalId string = ''
param tags object = {}

var reuse = !empty(existingResourceId)
var existingParts = split(existingResourceId, '/')
var dataContributorRole = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '8ebe5a00-799e-43f5-93ac-243d3dce84a7')
var serviceContributorRole = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '7ca78c08-252a-4471-8644-bb5ff32d4ba0')

resource created 'Microsoft.Search/searchServices@2023-11-01' = if (!reuse) {
  name: name
  location: location
  tags: tags
  sku: { name: 'basic' }
  identity: { type: 'SystemAssigned' }
  properties: {
    disableLocalAuth: true
    publicNetworkAccess: 'enabled'
    replicaCount: 1
    partitionCount: 1
    semanticSearch: 'free'
  }
}

resource existing 'Microsoft.Search/searchServices@2023-11-01' existing = if (reuse) {
  name: last(existingParts)
  scope: resourceGroup(existingParts[2], existingParts[4])
}

resource createdDataRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (!reuse && !empty(workloadPrincipalId)) {
  name: guid(created.id, workloadPrincipalId, dataContributorRole)
  scope: created
  properties: { principalId: workloadPrincipalId, principalType: 'ServicePrincipal', roleDefinitionId: dataContributorRole }
}
resource createdServiceRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (!reuse && !empty(workloadPrincipalId)) {
  name: guid(created.id, workloadPrincipalId, serviceContributorRole)
  scope: created
  properties: { principalId: workloadPrincipalId, principalType: 'ServicePrincipal', roleDefinitionId: serviceContributorRole }
}
var effectiveName = reuse ? existing!.name : created!.name
output resourceId string = reuse ? existing!.id : created!.id
output endpoint string = 'https://${effectiveName}.search.windows.net'
output reused bool = reuse
output existingResourceRequiresRbac bool = reuse && !empty(workloadPrincipalId)
