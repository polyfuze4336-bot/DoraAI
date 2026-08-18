param namePrefix string
param vaultName string
param dataLocation string = 'United States'
param tags object = {}

resource emailService 'Microsoft.Communication/emailServices@2023-04-01' = {
  name: '${namePrefix}-email'
  location: 'global'
  tags: tags
  properties: {
    dataLocation: dataLocation
  }
}

resource managedDomain 'Microsoft.Communication/emailServices/domains@2023-04-01' = {
  parent: emailService
  name: 'AzureManagedDomain'
  location: 'global'
  tags: tags
  properties: {
    domainManagement: 'AzureManaged'
  }
}

resource communicationService 'Microsoft.Communication/communicationServices@2023-04-01' = {
  name: '${namePrefix}-acs'
  location: 'global'
  tags: tags
  properties: {
    dataLocation: dataLocation
    linkedDomains: [
      managedDomain.id
    ]
  }
}

resource vault 'Microsoft.KeyVault/vaults@2023-07-01' existing = {
  name: vaultName
}

resource connectionSecret 'Microsoft.KeyVault/vaults/secrets@2023-07-01' = {
  parent: vault
  name: 'acs-email-connection-string'
  properties: {
    value: communicationService.listKeys().primaryConnectionString
  }
}

output communicationServiceId string = communicationService.id
output endpoint string = 'https://${communicationService.name}.communication.azure.com'
output senderAddress string = 'DoNotReply@${managedDomain.properties.fromSenderDomain}'
output connectionSecretUri string = connectionSecret.properties.secretUriWithVersion
