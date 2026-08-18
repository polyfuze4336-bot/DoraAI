using '../main.bicep'

param namePrefix = 'dora-demo'
param existingFoundryResourceId = '/subscriptions/870b491d-74bb-4aa7-95ab-647f262444d5/resourceGroups/rg-aisgemini-dev/providers/Microsoft.CognitiveServices/accounts/aif-yfjw6y'
param existingSearchResourceId = '/subscriptions/870b491d-74bb-4aa7-95ab-647f262444d5/resourceGroups/rg-aisgemini-dev/providers/Microsoft.Search/searchServices/srch-agentops'
param existingLogAnalyticsWorkspaceId = '/subscriptions/870b491d-74bb-4aa7-95ab-647f262444d5/resourceGroups/rg-aisgemini-dev/providers/Microsoft.OperationalInsights/workspaces/log-yfjw6y'
param existingApplicationInsightsResourceId = '/subscriptions/870b491d-74bb-4aa7-95ab-647f262444d5/resourceGroups/rg-aisgemini-dev/providers/Microsoft.Insights/components/appi-yfjw6y'
param existingContainerAppsEnvironmentId = '/subscriptions/870b491d-74bb-4aa7-95ab-647f262444d5/resourceGroups/rg-aisgemini-dev/providers/Microsoft.App/managedEnvironments/cae-yfjw6y'
param postgresAdministratorObjectId = 'eb96b05f-f6a6-48f4-9348-d37b3abad1a8'
param postgresAdministratorPrincipalName = 'admin@MngEnvMCAP682563.onmicrosoft.com'
param enableCommunicationEmail = true
param tags = {
  application: 'DORA'
  environment: 'prototype'
  managedBy: 'bicep'
}
