param location string
param name string
param existingResourceId string = ''
param workloadPrincipalId string = ''
param tags object = {}

var reuse = !empty(existingResourceId)
var existingParts = split(existingResourceId, '/')
var openAiUserRole = subscriptionResourceId('Microsoft.Authorization/roleDefinitions', '5e0bd9bd-7b93-4f28-af87-19fc36ad61bd')

resource created 'Microsoft.CognitiveServices/accounts@2024-10-01' = if (!reuse) {
  name: name
  location: location
  tags: tags
  kind: 'AIServices'
  sku: { name: 'S0' }
  identity: { type: 'SystemAssigned' }
  properties: {
    customSubDomainName: name
    disableLocalAuth: true
    publicNetworkAccess: 'Enabled'
  }
}

resource existing 'Microsoft.CognitiveServices/accounts@2024-10-01' existing = if (reuse) {
  name: last(existingParts)
  scope: resourceGroup(existingParts[2], existingParts[4])
}

resource createdRole 'Microsoft.Authorization/roleAssignments@2022-04-01' = if (!reuse && !empty(workloadPrincipalId)) {
  name: guid(created.id, workloadPrincipalId, openAiUserRole)
  scope: created
  properties: { principalId: workloadPrincipalId, principalType: 'ServicePrincipal', roleDefinitionId: openAiUserRole }
}
var effectiveName = reuse ? existing!.name : created!.name
output resourceId string = reuse ? existing!.id : created!.id
output endpoint string = 'https://${effectiveName}.cognitiveservices.azure.com'
output reused bool = reuse
output existingResourceRequiresRbac bool = reuse && !empty(workloadPrincipalId)
