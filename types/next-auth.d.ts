import "next-auth";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      name?: string | null;
      email?: string | null;
      rol: string;
    };
  }
  interface User {
    id: string;
    rol: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    rol: string;
  }
}
