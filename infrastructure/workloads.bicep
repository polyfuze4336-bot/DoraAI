targetScope = 'resourceGroup'

param location string = resourceGroup().location
param containerAppsEnvironmentResourceId string
param userAssignedIdentityResourceId string
param userAssignedIdentityClientId string
param registryServer string
param webImage string
param pipelineImage string
param postgresHost string
param postgresDatabase string = 'dora'
param postgresUser string
param storageBlobEndpoint string
param storageContainer string = 'dora-data'
param searchEndpoint string
param searchIndexName string = 'dora-knowledge'
param foundryEndpoint string
param fastModelDeployment string
param reasoningModelDeployment string
param embeddingModelDeployment string
@secure()
param applicationInsightsConnectionString string
param administratorPrincipalIds string
param communicationEmailEndpoint string = ''
param communicationEmailSenderAddress string = ''
param communicationEmailServiceName string
param reportRecipients string = ''
@allowed([
  'database'
  'entra'
])
param authProvider string = 'database'
@secure()
param authSessionSecret string = ''
param entraClientId string = ''
param entraTenantId string = ''
param dispatcherCron string = '*/30 * * * *'
param tags object = {
  application: 'DORA'
  environment: 'prototype'
  managedBy: 'bicep'
}

var commonEnvironment = [
  { name: 'NODE_ENV', value: 'production' }
  { name: 'DORA_ENV', value: 'production' }
  { name: 'NEXT_PUBLIC_DORA_DEMO_MODE', value: 'false' }
  { name: 'AUTH_PROVIDER', value: authProvider }
  { name: 'DORA_ROOT', value: '/app' }
  { name: 'DORA_ALLOW_LOCAL_ADMIN', value: 'false' }
  { name: 'DORA_TRUST_ENTRA_HEADERS', value: 'true' }
  { name: 'DORA_ADMIN_PRINCIPAL_IDS', value: administratorPrincipalIds }
  { name: 'AZURE_CLIENT_ID', value: userAssignedIdentityClientId }
  { name: 'AZURE_TENANT_ID', value: entraTenantId }
  { name: 'AZURE_STORAGE_BLOB_ENDPOINT', value: storageBlobEndpoint }
  { name: 'AZURE_STORAGE_CONTAINER', value: storageContainer }
  { name: 'AZURE_SEARCH_ENDPOINT', value: searchEndpoint }
  { name: 'AZURE_SEARCH_INDEX', value: searchIndexName }
  { name: 'DORA_FOUNDRY_ENDPOINT', value: foundryEndpoint }
  { name: 'DORA_FAST_MODEL', value: fastModelDeployment }
  { name: 'DORA_REASONING_MODEL', value: reasoningModelDeployment }
  { name: 'DORA_EMBEDDING_MODEL', value: embeddingModelDeployment }
  { name: 'AZURE_OPENAI_ENDPOINT', value: foundryEndpoint }
  { name: 'AZURE_OPENAI_CHAT_DEPLOYMENT', value: reasoningModelDeployment }
  { name: 'PGHOST', value: postgresHost }
  { name: 'PGPORT', value: '5432' }
  { name: 'PGDATABASE', value: postgresDatabase }
  { name: 'PGUSER', value: postgresUser }
  { name: 'PG_USE_ENTRA_IDENTITY', value: 'true' }
  { name: 'PGSSL', value: 'true' }
  { name: 'APPLICATIONINSIGHTS_CONNECTION_STRING', value: applicationInsightsConnectionString }
  { name: 'DORA_ENABLE_LIVE_METRICS', value: 'true' }
  { name: 'AZURE_COMMUNICATION_EMAIL_ENDPOINT', value: communicationEmailEndpoint }
  { name: 'DORA_REPORT_SENDER_ADDRESS', value: communicationEmailSenderAddress }
  { name: 'AZURE_COMMUNICATION_EMAIL_CONNECTION_STRING', secretRef: 'acs-email-connection-string' }
  { name: 'DORA_REPORT_RECIPIENTS', value: reportRecipients }
  { name: 'DORA_REPORT_TEST_RECIPIENTS', value: reportRecipients }
]

var webEnvironment = concat(commonEnvironment, authProvider == 'database' ? [
  { name: 'AUTH_SESSION_SECRET', secretRef: 'auth-session-secret' }
] : [])

resource communicationService 'Microsoft.Communication/communicationServices@2023-04-01' existing = {
  name: communicationEmailServiceName
}

resource web 'Microsoft.App/containerApps@2024-03-01' = {
  name: 'dora-web'
  location: location
  tags: tags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${userAssignedIdentityResourceId}': {}
    }
  }
  properties: {
    managedEnvironmentId: containerAppsEnvironmentResourceId
    configuration: {
      activeRevisionsMode: 'Single'
      ingress: {
        external: true
        allowInsecure: false
        targetPort: 3000
        transport: 'auto'
      }
      registries: [
        {
          server: registryServer
          identity: userAssignedIdentityResourceId
        }
      ]
      secrets: concat([
        {
          name: 'acs-email-connection-string'
          value: communicationService.listKeys().primaryConnectionString
        }
      ], authProvider == 'database' ? [
        {
          name: 'auth-session-secret'
          value: authSessionSecret
        }
      ] : [])
    }
    template: {
      containers: [
        {
          name: 'web'
          image: webImage
          env: webEnvironment
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
          probes: [
            {
              type: 'Liveness'
              httpGet: {
                path: '/api/health'
                port: 3000
                scheme: 'HTTP'
              }
              initialDelaySeconds: 20
              periodSeconds: 30
              timeoutSeconds: 5
              failureThreshold: 3
            }
            {
              type: 'Readiness'
              httpGet: {
                path: '/api/health'
                port: 3000
                scheme: 'HTTP'
              }
              initialDelaySeconds: 10
              periodSeconds: 10
              timeoutSeconds: 5
              failureThreshold: 6
            }
          ]
        }
      ]
      scale: {
        minReplicas: 1
        maxReplicas: 3
        rules: [
          {
            name: 'http-concurrency'
            http: {
              metadata: {
                concurrentRequests: '50'
              }
            }
          }
        ]
      }
    }
  }
}

resource webAuth 'Microsoft.App/containerApps/authConfigs@2024-03-01' = if (!empty(entraClientId) && !empty(entraTenantId)) {
  parent: web
  name: 'current'
  properties: {
    platform: {
      enabled: authProvider == 'entra'
      runtimeVersion: '~1'
    }
    globalValidation: {
      unauthenticatedClientAction: 'RedirectToLoginPage'
      redirectToProvider: 'azureactivedirectory'
      excludedPaths: [
        '/api/health'
      ]
    }
    httpSettings: {
      requireHttps: true
    }
    identityProviders: {
      azureActiveDirectory: {
        enabled: true
        registration: {
          clientId: entraClientId
          openIdIssuer: '${environment().authentication.loginEndpoint}${entraTenantId}/v2.0'
        }
        validation: {
          allowedAudiences: [
            entraClientId
            'api://${entraClientId}'
          ]
        }
      }
    }
    login: {
      preserveUrlFragmentsForLogins: true
      tokenStore: {
        enabled: false
      }
    }
  }
}

resource pipelineJob 'Microsoft.App/jobs@2024-03-01' = {
  name: 'dora-scheduled-processing'
  location: location
  tags: tags
  identity: {
    type: 'UserAssigned'
    userAssignedIdentities: {
      '${userAssignedIdentityResourceId}': {}
    }
  }
  properties: {
    environmentId: containerAppsEnvironmentResourceId
    configuration: {
      triggerType: 'Schedule'
      replicaTimeout: 1800
      replicaRetryLimit: 2
      registries: [
        {
          server: registryServer
          identity: userAssignedIdentityResourceId
        }
      ]
      secrets: [
        {
          name: 'acs-email-connection-string'
          value: communicationService.listKeys().primaryConnectionString
        }
      ]
      scheduleTriggerConfig: {
        cronExpression: dispatcherCron
        parallelism: 1
        replicaCompletionCount: 1
      }
    }
    template: {
      containers: [
        {
          name: 'pipeline'
          image: pipelineImage
          env: commonEnvironment
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
        }
      ]
    }
  }
}

output webAppName string = web.name
output webFqdn string = web.properties.configuration.ingress.fqdn
output pipelineJobName string = pipelineJob.name
