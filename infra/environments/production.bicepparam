using '../main.bicep'

param namePrefix = 'dora-prod'
param tags = {
  application: 'DORA'
  environment: 'production'
  managedBy: 'bicep'
}
