param location string
param name string
param existingResourceId string = ''
param tags object = {}

var reuse = !empty(existingResourceId)
var existingParts = split(existingResourceId, '/')

resource created 'Microsoft.App/managedEnvironments@2024-03-01' = if (!reuse) {
  name: name
  location: location
  tags: tags
  properties: {
    appLogsConfiguration: { destination: 'azure-monitor' }
    zoneRedundant: false
  }
}
resource existing 'Microsoft.App/managedEnvironments@2024-03-01' existing = if (reuse) {
  name: last(existingParts)
  scope: resourceGroup(existingParts[2], existingParts[4])
}

output resourceId string = reuse ? existing.id : created.id
output reused bool = reuse
