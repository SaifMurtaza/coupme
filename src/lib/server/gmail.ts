import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'

export class GmailClient {
  private oauth2Client: OAuth2Client

  constructor(clientId: string, clientSecret: string, redirectUri: string) {
    if (!clientId || !clientSecret || !redirectUri) {
      throw new Error('Missing required OAuth2 parameters')
    }

    this.oauth2Client = new google.auth.OAuth2(
      clientId,
      clientSecret,
      redirectUri
    )
  }

  getAuthUrl(): string {
    return this.oauth2Client.generateAuthUrl({
      access_type: 'offline',
      scope: [
        'https://www.googleapis.com/auth/gmail.readonly',
        'https://www.googleapis.com/auth/userinfo.email',
      ],
      prompt: 'consent',
    })
  }

  async getTokens(code: string) {
    if (!code) {
      throw new Error('Authorization code is required')
    }
    const { tokens } = await this.oauth2Client.getToken(code)
    return tokens
  }

  setCredentials(tokens: any) {
    if (!tokens) {
      throw new Error('Tokens are required')
    }
    this.oauth2Client.setCredentials(tokens)
  }

  async listEmails(query: string): Promise<any[]> {
    try {
      const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client })
      const response = await gmail.users.messages.list({
        userId: 'me',
        q: query,
        maxResults: 100,
      })

      if (!response.data.messages) {
        console.log('No messages found matching query')
        return []
      }

      console.log(`Fetching details for ${response.data.messages.length} messages`)
      const messages = await Promise.all(
        response.data.messages.map(async (message) => {
          try {
            const details = await gmail.users.messages.get({
              userId: 'me',
              id: message.id!,
              format: 'full',
            })
            return details.data
          } catch (error) {
            console.error(`Error fetching message ${message.id}:`, error)
            return null
          }
        })
      )

      return messages.filter((msg): msg is NonNullable<typeof msg> => msg !== null)
    } catch (error) {
      console.error('Error listing emails:', error)
      throw error
    }
  }

  async getUserEmail(): Promise<string> {
    const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client })
    const profile = await gmail.users.getProfile({ userId: 'me' })
    return profile.data.emailAddress || ''
  }
} 