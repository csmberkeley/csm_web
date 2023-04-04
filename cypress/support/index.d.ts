interface LoginInfo {
  username: string;
  password: string;
}

interface SetupDBOptions {
  force?: boolean;
  mutate?: boolean;
}

declare namespace Cypress {
  interface Chainable {
    login(loginInfo?: LoginInfo): Chainable<void>;
    setupDB(script_name: string, func_name: string, options?: SetupDBOptions): Chainable<void>;
    initDB(): Chainable<void>;
    _exec(command: string): Chainable<void>;
  }
}
