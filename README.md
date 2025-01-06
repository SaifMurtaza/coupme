# Coupme

Coupme is a web application that helps you find and manage coupons and discounts from your Gmail inbox. It automatically scans your promotional emails and extracts coupon codes and discounts, making it easy to find and use them before they expire.

## Features

- Connect your Gmail account securely
- Scan promotional emails for coupons and discounts
- Filter coupons by store, code, or description
- View expiration dates and discount details
- Direct links to original emails
- Clean and modern user interface

## Getting Started

### Prerequisites

- Node.js 18 or later
- A Google Cloud Platform account with Gmail API enabled
- OAuth 2.0 credentials for the Gmail API

### Environment Variables

Create a `.env.local` file in the root directory with the following variables:

```env
GMAIL_CLIENT_ID=your_client_id
GMAIL_CLIENT_SECRET=your_client_secret
NEXTAUTH_SECRET=your_random_secret
NEXTAUTH_URL=http://localhost:3000
```

### Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/coupme.git
cd coupme
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm run dev
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

## Setting up Google OAuth

1. Go to the [Google Cloud Console](https://console.cloud.google.com)
2. Create a new project or select an existing one
3. Enable the Gmail API
4. Configure the OAuth consent screen
5. Create OAuth 2.0 credentials
6. Add authorized JavaScript origins and redirect URIs
7. Copy the client ID and client secret to your `.env.local` file

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## License

This project is licensed under the MIT License - see the LICENSE file for details. 