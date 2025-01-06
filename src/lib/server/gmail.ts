import { google } from 'googleapis'
import { OAuth2Client } from 'google-auth-library'

export class GmailClient {
  private oauth2Client: OAuth2Client

  constructor(clientId: string, clientSecret: string, redirectUri: string) {
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
    const { tokens } = await this.oauth2Client.getToken(code)
    return tokens
  }

  setCredentials(tokens: any) {
    this.oauth2Client.setCredentials(tokens)
  }

  async listEmails(query: string): Promise<any[]> {
    const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client })
    const response = await gmail.users.messages.list({
      userId: 'me',
      q: query,
      maxResults: 100,
    })

    if (!response.data.messages) {
      return []
    }

    const messages = await Promise.all(
      response.data.messages.map(async (message) => {
        const details = await gmail.users.messages.get({
          userId: 'me',
          id: message.id!,
          format: 'full',
        })
        return details.data
      })
    )

    return messages
  }

  async getUserEmail(): Promise<string> {
    const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client })
    const profile = await gmail.users.getProfile({ userId: 'me' })
    return profile.data.emailAddress || ''
  }
} 