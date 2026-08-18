using '../main.bicep'

param namePrefix = 'dora-dev'
param tags = {
  application: 'DORA'
  environment: 'development'
  managedBy: 'bicep'
}
