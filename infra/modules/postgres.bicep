param location string
param name string
param existingResourceId string = ''
param administratorObjectId string = ''
param administratorPrincipalName string = ''
param tags object = {}

var reuse = !empty(existingResourceId)
var canCreate = !reuse && !empty(administratorObjectId) && !empty(administratorPrincipalName)
var existingParts = split(existingResourceId, '/')

resource created 'Microsoft.DBforPostgreSQL/flexibleServers@2024-08-01' = if (canCreate) {
  name: name
  location: location
  tags: tags
  sku: { name: 'Standard_B1ms', tier: 'Burstable' }
  properties: {
    version: '16'
    authConfig: {
      activeDirectoryAuth: 'Enabled'
      passwordAuth: 'Disabled'
      tenantId: tenant().tenantId
    }
    backup: {
      backupRetentionDays: 7
      geoRedundantBackup: 'Disabled'
    }
    highAvailability: { mode: 'Disabled' }
    network: { publicNetworkAccess: 'Enabled' }
    storage: { storageSizeGB: 32, autoGrow: 'Enabled' }
  }
}
resource administrator 'Microsoft.DBforPostgreSQL/flexibleServers/administrators@2024-08-01' = if (canCreate) {
  parent: created
  name: administratorObjectId
  properties: {
    principalName: administratorPrincipalName
    principalType: 'User'
    tenantId: tenant().tenantId
  }
}
resource database 'Microsoft.DBforPostgreSQL/flexibleServers/databases@2024-08-01' = if (canCreate) {
  parent: created
  name: 'dora'
  properties: {}
}
resource allowAzureServices 'Microsoft.DBforPostgreSQL/flexibleServers/firewallRules@2024-08-01' = if (canCreate) {
  parent: created
  name: 'AllowAzureServices'
  properties: {
    startIpAddress: '0.0.0.0'
    endIpAddress: '0.0.0.0'
  }
}
resource existing 'Microsoft.DBforPostgreSQL/flexibleServers@2024-08-01' existing = if (reuse) {
  name: last(existingParts)
  scope: resourceGroup(existingParts[2], existingParts[4])
}

output resourceId string = reuse ? existing!.id : canCreate ? created!.id : ''
output host string = reuse
  ? reference(existingResourceId, '2024-08-01').fullyQualifiedDomainName
  : canCreate ? created!.properties.fullyQualifiedDomainName : ''
output created bool = canCreate
output reused bool = reuse
