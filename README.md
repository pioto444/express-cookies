# Express Recipe Manager

A recipe management web application built with Node.js, Express, and EJS. Users can create accounts, manage their recipes, and admins can manage all users and recipes.

## Quick Start

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file:
```env
PORT=3000
SESSION_SECRET=your_secret_key
ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD=admin_password
```

3. Start the app:
```bash
npm start
```

## Test Accounts

- **User**: peter@b.com / 123456789
- **Admin**: Totrek@example.com / A$AP_Rocky2609_Berlin

## Features

- User authentication with Argon2 password hashing
- Create, view, and manage recipes with ingredients and instructions
- User isolation (users only see their own recipes)
- Admin panel for managing all users and recipes
- Secure session management with cookies

## Tech Stack

- **Backend**: Node.js, Express.js
- **Templates**: EJS
- **Security**: Argon2, express-session

## Project Structure

- `index.js` - Main application with all routes
- `forms/` - Database operations (user.js, recipies.js)
- `public/` - Static assets and CSS
- `views/` - EJS templates

## Author

Piotr Barabanow

## License

ISC
