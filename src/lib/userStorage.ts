// Shared in-memory user storage for demo purposes
// In production, this would be replaced with a proper database

interface User {
  id: string
  email: string
  password: string
  name: string
  createdAt: string
}

// Singleton pattern to ensure same storage instance across all modules
class UserStorage {
  private static instance: UserStorage
  private users: User[] = []

  private constructor() {}

  static getInstance(): UserStorage {
    if (!UserStorage.instance) {
      UserStorage.instance = new UserStorage()
    }
    return UserStorage.instance
  }

  addUser(user: User): void {
    this.users.push(user)
  }

  findUserByEmail(email: string): User | undefined {
    return this.users.find(user => user.email === email)
  }

  findUserById(id: string): User | undefined {
    return this.users.find(user => user.id === id)
  }

  getAllUsers(): User[] {
    return [...this.users]
  }

  userExists(email: string): boolean {
    return this.users.some(user => user.email === email)
  }
}

export const userStorage = UserStorage.getInstance()
export type { User }