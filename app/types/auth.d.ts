declare module '#auth-utils' {
  interface User {
    id: string
    email: string
    role: 'admin' | 'user'
  }

  interface UserSession {
    loggedInAt: Date
  }
}

export {}
