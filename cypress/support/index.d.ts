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
    logout(): Chainable<void>;
    logout_redirect(): Chainable<void>;
    setupDB(script_name: string, func_name: string, options?: SetupDBOptions): Chainable<void>;
    initDB(): Chainable<void>;
    _exec(command: string): Chainable<void>;
    clickUntil(
      condition: ($el: JQuery<HTMLElement>) => void | Chainable<JQuery<HTMLElement>>
    ): Chainable<JQuery<HTMLElement>>;
  }
}
