targetScope = 'resourceGroup'

@description('Existing Container Apps managed environment resource ID.')
param containerAppsEnvironmentResourceId string

@description('Fully qualified DORA pipeline container image.')
param pipelineImage string

@description('Dispatcher cron copied from config/schedules.json at deployment time.')
param dispatcherCron string

@description('Managed identity resource ID used by the job.')
param userAssignedIdentityResourceId string

@description('Non-secret environment variables supplied by the deployment pipeline.')
param environmentVariables array = []

resource pipelineJob 'Microsoft.App/jobs@2024-03-01' = {
  name: 'dora-scheduled-processing'
  location: resourceGroup().location
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
          env: environmentVariables
          resources: {
            cpu: json('0.5')
            memory: '1Gi'
          }
        }
      ]
    }
  }
}

output jobName string = pipelineJob.name