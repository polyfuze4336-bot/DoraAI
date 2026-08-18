import "server-only";

import { compare } from "bcryptjs";
import { Pool } from "pg";

import {
  createPostgresPoolConfig,
  postgresConfigFromEnvironment,
} from "@dora/storage";

import type {
  AuthenticatedUser,
  AuthenticationProvider,
} from "./contracts";

interface UserRow {
  readonly id: string;
  readonly username: string;
  readonly password_hash: string;
  readonly display_name: string;
  readonly role: string;
}

export class DatabaseAuthenticationProvider implements AuthenticationProvider {
  async authenticate(
    username: string,
    password: string,
  ): Promise<AuthenticatedUser | null> {
    const config = postgresConfigFromEnvironment();
    if (!config) throw new Error("Azure PostgreSQL authentication is not configured.");
    const pool = new Pool(createPostgresPoolConfig(config));
    try {
      const result = await pool.query<UserRow>(
        `SELECT id::text, username, password_hash, display_name, role
         FROM users
         WHERE lower(username) = lower($1) AND is_active = true
         LIMIT 1`,
        [username.trim()],
      );
      const user = result.rows[0];
      if (!user || !(await compare(password, user.password_hash))) return null;
      await pool.query("UPDATE users SET last_login_at = now() WHERE id = $1", [
        user.id,
      ]);
      return {
        id: user.id,
        username: user.username,
        displayName: user.display_name,
        role: user.role,
      };
    } finally {
      await pool.end();
    }
  }
}