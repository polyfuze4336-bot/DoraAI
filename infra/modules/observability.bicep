param location string
param namePrefix string
param existingLogAnalyticsWorkspaceId string = ''
param existingApplicationInsightsResourceId string = ''
param tags object = {}

var reuseWorkspace = !empty(existingLogAnalyticsWorkspaceId)
var reuseInsights = !empty(existingApplicationInsightsResourceId)
var workspaceParts = split(existingLogAnalyticsWorkspaceId, '/')
var insightsParts = split(existingApplicationInsightsResourceId, '/')

resource workspaceCreated 'Microsoft.OperationalInsights/workspaces@2023-09-01' = if (!reuseWorkspace) {
  name: '${namePrefix}-logs'
  location: location
  tags: tags
  properties: {
    retentionInDays: 30
    sku: { name: 'PerGB2018' }
    workspaceCapping: { dailyQuotaGb: 1 }
  }
}
resource workspaceExisting 'Microsoft.OperationalInsights/workspaces@2023-09-01' existing = if (reuseWorkspace) {
  name: last(workspaceParts)
  scope: resourceGroup(workspaceParts[2], workspaceParts[4])
}

var workspaceId = reuseWorkspace ? workspaceExisting.id : workspaceCreated.id

resource insightsCreated 'Microsoft.Insights/components@2020-02-02' = if (!reuseInsights) {
  name: '${namePrefix}-appi'
  location: location
  tags: tags
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: workspaceId
    RetentionInDays: 30
    DisableLocalAuth: true
    IngestionMode: 'LogAnalytics'
  }
}
resource insightsExisting 'Microsoft.Insights/components@2020-02-02' existing = if (reuseInsights) {
  name: last(insightsParts)
  scope: resourceGroup(insightsParts[2], insightsParts[4])
}

output logAnalyticsWorkspaceId string = workspaceId
output applicationInsightsResourceId string = reuseInsights ? insightsExisting.id : insightsCreated.id
output applicationInsightsConnectionString string = reuseInsights
  ? reference(existingApplicationInsightsResourceId, '2020-02-02').ConnectionString
  : insightsCreated!.properties.ConnectionString
output reusedLogAnalytics bool = reuseWorkspace
output reusedApplicationInsights bool = reuseInsights
