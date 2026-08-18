targetScope = 'resourceGroup'

@description('Azure region for the DORA data foundation.')
param location string = resourceGroup().location

@minLength(2)
@maxLength(12)
@description('Lowercase prefix used for globally unique resource names.')
param namePrefix string = 'dora'

@description('Object ID of the Microsoft Entra PostgreSQL administrator.')
param postgresAdministratorObjectId string

@description('Display name or UPN of the Microsoft Entra PostgreSQL administrator.')
param postgresAdministratorPrincipalName string

@allowed([
  'Group'
  'ServicePrincipal'
  'User'
])
param postgresAdministratorPrincipalType string = 'Group'

@description('Managed identity principal IDs used by the DORA web app and pipeline.')
param applicationPrincipalIds array = []

@description('Enable public endpoints for the prototype. Set false after private endpoints are supplied.')
param enablePublicNetworkAccess bool = true

param tags object = {
  application: 'DORA'
  environment: 'prototype'
  workload: 'commodity-intelligence'
  managedBy: 'bicep'
}

var uniqueSuffix = uniqueString(subscription().id, resourceGroup().id)
var storageAccountName = take(toLower(replace('${namePrefix}data${uniqueSuffix}', '-', '')), 24)
var postgresServerName = take(toLower('${namePrefix}-pg-${uniqueSuffix}'), 63)
var searchServiceName = take(toLower('${namePrefix}-search-${uniqueSuffix}'), 60)
var publicNetworkAccess = enablePublicNetworkAccess ? 'Enabled' : 'Disabled'
var searchDataContributorRoles = [for principalId in applicationPrincipalIds: {
  principalId: principalId
  principalType: 'ServicePrincipal'
  roleDefinitionIdOrName: 'Search Index Data Contributor'
}]
var searchServiceContributorRoles = [for principalId in applicationPrincipalIds: {
  principalId: principalId
  principalType: 'ServicePrincipal'
  roleDefinitionIdOrName: 'Search Service Contributor'
}]

module storage 'br/public:avm/res/storage/storage-account:0.33.0' = {
  name: 'dora-storage'
  params: {
    name: storageAccountName
    location: location
    skuName: 'Standard_LRS'
    kind: 'StorageV2'
    accessTier: 'Hot'
    allowBlobPublicAccess: false
    allowSharedKeyAccess: false
    defaultToOAuthAuthentication: true
    minimumTlsVersion: 'TLS1_2'
    publicNetworkAccess: publicNetworkAccess
    requireInfrastructureEncryption: true
    blobServices: {
      deleteRetentionPolicyEnabled: true
      deleteRetentionPolicyDays: 7
      containerDeleteRetentionPolicyEnabled: true
      containerDeleteRetentionPolicyDays: 7
      isVersioningEnabled: true
      containers: [
        {
          name: 'dora-data'
          publicAccess: 'None'
        }
      ]
    }
    roleAssignments: [for principalId in applicationPrincipalIds: {
      principalId: principalId
      principalType: 'ServicePrincipal'
      roleDefinitionIdOrName: 'Storage Blob Data Contributor'
    }]
    tags: tags
  }
}

module postgres 'br/public:avm/res/db-for-postgre-sql/flexible-server:0.16.0' = {
  name: 'dora-postgres'
  params: {
    name: postgresServerName
    location: location
    availabilityZone: -1
    skuName: 'Standard_B1ms'
    tier: 'Burstable'
    version: '16'
    storageSizeGB: 32
    autoGrow: 'Enabled'
    backupRetentionDays: 7
    geoRedundantBackup: 'Disabled'
    highAvailability: 'Disabled'
    publicNetworkAccess: publicNetworkAccess
    authConfig: {
      activeDirectoryAuth: 'Enabled'
      passwordAuth: 'Disabled'
    }
    administrators: [
      {
        objectId: postgresAdministratorObjectId
        principalName: postgresAdministratorPrincipalName
        principalType: postgresAdministratorPrincipalType
        tenantId: tenant().tenantId
      }
    ]
    databases: [
      {
        name: 'dora'
      }
    ]
    firewallRules: enablePublicNetworkAccess ? [
      {
        name: 'AllowAzureServices'
        startIpAddress: '0.0.0.0'
        endIpAddress: '0.0.0.0'
      }
    ] : []
    tags: tags
  }
}

module search 'br/public:avm/res/search/search-service:0.13.0' = {
  name: 'dora-search'
  params: {
    name: searchServiceName
    location: location
    sku: 'basic'
    replicaCount: 1
    partitionCount: 1
    disableLocalAuth: true
    semanticSearch: 'free'
    publicNetworkAccess: publicNetworkAccess
    managedIdentities: {
      systemAssigned: true
    }
    roleAssignments: concat(searchDataContributorRoles, searchServiceContributorRoles)
    tags: tags
  }
}

output storageBlobEndpoint string = storage.outputs.primaryBlobEndpoint!
output postgresHost string = postgres.outputs.fqdn!
output postgresDatabase string = 'dora'
output searchEndpoint string = search.outputs.endpoint!
output searchIndexName string = 'dora-knowledge'
