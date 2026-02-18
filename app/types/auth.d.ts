declare module '#auth-utils' {
  interface User {
    id: string
    email: string
  }

  interface UserSession {
    loggedInAt: Date
  }
}

export {}
