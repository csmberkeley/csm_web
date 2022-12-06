interface SetupDBOptions {
  force?: boolean;
  mutate?: boolean;
}

declare namespace Cypress {
  interface Chainable {
    login(): Chainable<void>;
    setupDB(script_name: string, func_name: string, options?: SetupDBOptions): Chainable<void>;
    initDB(): Chainable<void>;
    _exec(command: string): Chainable<void>;
  }
}
