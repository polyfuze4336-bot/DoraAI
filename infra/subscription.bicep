targetScope = 'subscription'

param location string = 'eastus2'
param postgresLocation string = 'westus3'
param resourceGroupName string = 'rg-dora-demo'
param namePrefix string = 'dora-demo'
param existingFoundryResourceId string
param existingSearchResourceId string
param existingLogAnalyticsWorkspaceId string
param existingApplicationInsightsResourceId string
param existingContainerAppsEnvironmentId string
param existingStorageResourceId string = ''
param postgresAdministratorObjectId string
param postgresAdministratorPrincipalName string
param enableCommunicationEmail bool = true
param communicationDataLocation string = 'United States'
param deployWorkloads bool = true
param registryServer string = 'craisgeminidevyfjw6y.azurecr.io'
param webImage string = 'craisgeminidevyfjw6y.azurecr.io/dora-web:validation'
param pipelineImage string = 'craisgeminidevyfjw6y.azurecr.io/dora-pipeline:validation'
param fastModelDeployment string = 'gpt-4o'
param reasoningModelDeployment string = 'gpt-4o'
param embeddingModelDeployment string = 'text-embedding-3-small'
param reportRecipients string = ''
@allowed([
  'database'
  'entra'
])
param authProvider string = 'database'
@secure()
param authSessionSecret string = ''
param entraClientId string = ''
param entraTenantId string = tenant().tenantId
param tags object = {
  application: 'DORA'
  environment: 'prototype'
  managedBy: 'bicep'
}

resource targetResourceGroup 'Microsoft.Resources/resourceGroups@2024-03-01' = {
  name: resourceGroupName
  location: location
  tags: tags
}

module platform './main.bicep' = {
  name: 'dora-platform'
  scope: targetResourceGroup
  params: {
    location: location
    postgresLocation: postgresLocation
    namePrefix: namePrefix
    existingFoundryResourceId: existingFoundryResourceId
    existingSearchResourceId: existingSearchResourceId
    existingLogAnalyticsWorkspaceId: existingLogAnalyticsWorkspaceId
    existingApplicationInsightsResourceId: existingApplicationInsightsResourceId
    existingContainerAppsEnvironmentId: existingContainerAppsEnvironmentId
    existingStorageAccountId: existingStorageResourceId
    postgresAdministratorObjectId: postgresAdministratorObjectId
    postgresAdministratorPrincipalName: postgresAdministratorPrincipalName
    enableCommunicationEmail: enableCommunicationEmail
    communicationDataLocation: communicationDataLocation
    tags: tags
  }
}

module reusedStorageAccess './modules/reused-storage-access.bicep' = if (!empty(existingStorageResourceId)) {
  name: 'dora-reused-storage-access'
  scope: resourceGroup(split(existingStorageResourceId, '/')[2], split(existingStorageResourceId, '/')[4])
  params: {
    storageAccountName: last(split(existingStorageResourceId, '/'))
    principalId: platform.outputs.workloadIdentityPrincipalId
  }
}

module reusedResourceRbac './modules/reused-resource-rbac.bicep' = {
  name: 'dora-reused-resource-rbac'
  scope: resourceGroup('rg-aisgemini-dev')
  params: {
    principalId: platform.outputs.workloadIdentityPrincipalId
    foundryAccountName: 'aif-yfjw6y'
    searchServiceName: 'srch-agentops'
    containerRegistryName: 'craisgeminidevyfjw6y'
    applicationInsightsName: 'appi-yfjw6y'
  }
}

module workloads '../infrastructure/workloads.bicep' = if (deployWorkloads) {
  name: 'dora-workloads'
  scope: targetResourceGroup
  params: {
    location: location
    containerAppsEnvironmentResourceId: platform.outputs.containerAppsEnvironmentId
    userAssignedIdentityResourceId: platform.outputs.workloadIdentityResourceId
    userAssignedIdentityClientId: platform.outputs.workloadIdentityClientId
    registryServer: registryServer
    webImage: webImage
    pipelineImage: pipelineImage
    postgresHost: platform.outputs.postgresHost
    postgresUser: platform.outputs.workloadIdentityName
    storageBlobEndpoint: platform.outputs.storageBlobEndpoint
    searchEndpoint: platform.outputs.searchEndpoint
    foundryEndpoint: platform.outputs.foundryEndpoint
    fastModelDeployment: fastModelDeployment
    reasoningModelDeployment: reasoningModelDeployment
    embeddingModelDeployment: embeddingModelDeployment
    applicationInsightsConnectionString: platform.outputs.applicationInsightsConnectionString
    administratorPrincipalIds: postgresAdministratorObjectId
    communicationEmailEndpoint: platform.outputs.communicationEmailEndpoint
    communicationEmailSenderAddress: platform.outputs.communicationEmailSenderAddress
    communicationEmailServiceName: platform.outputs.communicationEmailServiceName
    reportRecipients: reportRecipients
    authProvider: authProvider
    authSessionSecret: authSessionSecret
    entraClientId: entraClientId
    entraTenantId: entraTenantId
    tags: tags
  }
}

output resourceGroupName string = targetResourceGroup.name
output workloadIdentityResourceId string = platform.outputs.workloadIdentityResourceId
output workloadIdentityPrincipalId string = platform.outputs.workloadIdentityPrincipalId
output workloadIdentityName string = platform.outputs.workloadIdentityName
output workloadIdentityClientId string = platform.outputs.workloadIdentityClientId
output storageBlobEndpoint string = platform.outputs.storageBlobEndpoint
output searchEndpoint string = platform.outputs.searchEndpoint
output foundryEndpoint string = platform.outputs.foundryEndpoint
output keyVaultUri string = platform.outputs.keyVaultUri
output postgresHost string = platform.outputs.postgresHost
output applicationInsightsConnectionString string = platform.outputs.applicationInsightsConnectionString
output communicationEmailEndpoint string = platform.outputs.communicationEmailEndpoint
output communicationEmailSenderAddress string = platform.outputs.communicationEmailSenderAddress
output containerAppsEnvironmentId string = platform.outputs.containerAppsEnvironmentId
output webFqdn string = deployWorkloads ? workloads!.outputs.webFqdn : ''
output pipelineJobName string = deployWorkloads ? workloads!.outputs.pipelineJobName : ''
