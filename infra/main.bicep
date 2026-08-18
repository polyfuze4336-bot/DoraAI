targetScope = 'resourceGroup'

@description('Azure region for resources created by DORA.')
param location string = resourceGroup().location
@description('Azure region for PostgreSQL when subscription capacity differs from the workload region.')
param postgresLocation string = location
@description('Lowercase resource name prefix.')
param namePrefix string = 'dora'

@description('Reuse an existing Microsoft Foundry / AI Services resource when supplied.')
param existingFoundryResourceId string = ''
@description('Reuse an existing Azure AI Search resource when supplied.')
param existingSearchResourceId string = ''
@description('Reuse an existing Azure Key Vault resource when supplied.')
param existingKeyVaultResourceId string = ''
@description('Reuse an existing Log Analytics workspace when supplied.')
param existingLogAnalyticsWorkspaceId string = ''
@description('Reuse an existing Application Insights resource when supplied.')
param existingApplicationInsightsResourceId string = ''
@description('Reuse an existing Container Apps managed environment when supplied.')
param existingContainerAppsEnvironmentId string = ''
@description('Reuse an existing Storage Account when supplied.')
param existingStorageAccountId string = ''
@description('Reuse an existing PostgreSQL Flexible Server when supplied.')
param existingPostgresResourceId string = ''

@description('Create Azure Communication Services Email with an Azure-managed sender domain.')
param enableCommunicationEmail bool = false
@description('ACS Email data residency location.')
param communicationDataLocation string = 'United States'

@description('PostgreSQL Entra administrator object ID, required only when creating PostgreSQL.')
param postgresAdministratorObjectId string = ''
@description('PostgreSQL Entra administrator principal name, required only when creating PostgreSQL.')
param postgresAdministratorPrincipalName string = ''

param tags object = {
  application: 'DORA'
  environment: 'prototype'
  managedBy: 'bicep'
}

var suffix = uniqueString(subscription().id, resourceGroup().id)

resource workloadIdentity 'Microsoft.ManagedIdentity/userAssignedIdentities@2023-01-31' = {
  name: '${namePrefix}-workload-id'
  location: location
  tags: tags
}

module observability './modules/observability.bicep' = {
  name: 'observability'
  params: {
    location: location
    namePrefix: namePrefix
    existingLogAnalyticsWorkspaceId: existingLogAnalyticsWorkspaceId
    existingApplicationInsightsResourceId: existingApplicationInsightsResourceId
    tags: tags
  }
}

module storage './modules/storage.bicep' = {
  name: 'storage'
  params: {
    location: location
    name: take(toLower(replace('${namePrefix}data${suffix}', '-', '')), 24)
    existingResourceId: existingStorageAccountId
    workloadPrincipalId: workloadIdentity.properties.principalId
    tags: tags
  }
}

module search './modules/search.bicep' = {
  name: 'search'
  params: {
    location: location
    name: take(toLower('${namePrefix}-search-${suffix}'), 60)
    existingResourceId: existingSearchResourceId
    workloadPrincipalId: workloadIdentity.properties.principalId
    tags: tags
  }
}

module keyVault './modules/key-vault.bicep' = {
  name: 'key-vault'
  params: {
    location: location
    name: take(toLower('${namePrefix}-kv-${suffix}'), 24)
    existingResourceId: existingKeyVaultResourceId
    workloadPrincipalId: workloadIdentity.properties.principalId
    tags: tags
  }
}

module foundry './modules/foundry.bicep' = {
  name: 'foundry'
  params: {
    location: location
    name: take(toLower('${namePrefix}-ai-${suffix}'), 64)
    existingResourceId: existingFoundryResourceId
    workloadPrincipalId: workloadIdentity.properties.principalId
    tags: tags
  }
}

module containerAppsEnvironment './modules/container-apps-environment.bicep' = {
  name: 'container-apps-environment'
  params: {
    location: location
    name: '${namePrefix}-cae'
    existingResourceId: existingContainerAppsEnvironmentId
    tags: tags
  }
}

module postgres './modules/postgres.bicep' = {
  name: 'postgres'
  params: {
    location: postgresLocation
    name: take(toLower('${namePrefix}-pg-${suffix}'), 63)
    existingResourceId: existingPostgresResourceId
    administratorObjectId: postgresAdministratorObjectId
    administratorPrincipalName: postgresAdministratorPrincipalName
    tags: tags
  }
}

module communicationEmail './modules/communication-email.bicep' = if (enableCommunicationEmail) {
  name: 'communication-email'
  params: {
    namePrefix: namePrefix
    vaultName: keyVault.outputs.name
    dataLocation: communicationDataLocation
    tags: tags
  }
}

output workloadIdentityResourceId string = workloadIdentity.id
output workloadIdentityClientId string = workloadIdentity.properties.clientId
output workloadIdentityPrincipalId string = workloadIdentity.properties.principalId
output workloadIdentityName string = workloadIdentity.name
output foundryResourceId string = foundry.outputs.resourceId
output foundryEndpoint string = foundry.outputs.endpoint
output searchResourceId string = search.outputs.resourceId
output searchEndpoint string = search.outputs.endpoint
output keyVaultResourceId string = keyVault.outputs.resourceId
output keyVaultUri string = keyVault.outputs.vaultUri
output logAnalyticsWorkspaceId string = observability.outputs.logAnalyticsWorkspaceId
output applicationInsightsResourceId string = observability.outputs.applicationInsightsResourceId
output applicationInsightsConnectionString string = observability.outputs.applicationInsightsConnectionString
output containerAppsEnvironmentId string = containerAppsEnvironment.outputs.resourceId
output storageAccountId string = storage.outputs.resourceId
output storageBlobEndpoint string = storage.outputs.blobEndpoint
output postgresResourceId string = postgres.outputs.resourceId
output postgresHost string = postgres.outputs.host
output communicationEmailServiceName string = enableCommunicationEmail ? last(split(communicationEmail!.outputs.communicationServiceId, '/')) : ''
output communicationEmailEndpoint string = enableCommunicationEmail ? communicationEmail!.outputs.endpoint : ''
output communicationEmailSenderAddress string = enableCommunicationEmail ? communicationEmail!.outputs.senderAddress : ''
output communicationEmailConnectionSecretUri string = enableCommunicationEmail ? communicationEmail!.outputs.connectionSecretUri : ''
output reuseSummary object = {
  foundry: foundry.outputs.reused
  search: search.outputs.reused
  keyVault: keyVault.outputs.reused
  logAnalytics: observability.outputs.reusedLogAnalytics
  applicationInsights: observability.outputs.reusedApplicationInsights
  containerAppsEnvironment: containerAppsEnvironment.outputs.reused
  storage: storage.outputs.reused
  postgres: postgres.outputs.reused
}
output reusedResourceRbacRequired object = {
  foundry: foundry.outputs.existingResourceRequiresRbac
  search: search.outputs.existingResourceRequiresRbac
  keyVault: keyVault.outputs.existingResourceRequiresRbac
  storage: storage.outputs.existingResourceRequiresRbac
}
