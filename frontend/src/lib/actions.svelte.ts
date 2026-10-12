export type ActionType = (args: any) => Promise<void>;
export type ActionHandler = {
  callback: ActionType;
  description: string;
};

class ActionsManagerError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ActionsManagerError';
  }
}

export class ActionsManager {
  private namespaces: Record<string, Namespace> = {};

  public async resolveAction(action: string, args: Record<string, any> = {}) {
    let m = action.match(/^([a-z_\-]+)\.([a-z_\-]+[0-9]*)$/);
    if (m == null) {
      throw new ActionsManagerError(`'${action}' is not an valid action`);
    }

    const [_, namespace, method]: Array<string> = m;
    if (!(namespace in this.namespaces)) {
      throw new ActionsManagerError(`'${namespace}' is not an valid namespace`);
    }

    let ns = this.namespaces[namespace];
    let callback = ns?.getAction(method);
    await callback?.callback.call(null, args);
  }

  public registerNamespace(name: string): Namespace {
    if (name in this.namespaces) {
      return this.namespaces[name];
    }

    let namespace = new Namespace(name);
    this.namespaces[name] = namespace;
    return namespace;
  }

  public unregisterNamespace(name: string): void {
    if (!(name in this.namespaces)) {
      throw new ActionsManagerError(`'${name}' namespace doesn't exist`);
    }

    delete this.namespaces[name];
  }

  public getNamespace(name: string): Namespace | undefined {
    return this.namespaces[name];
  }
}

class Namespace {
  public readonly name: string;
  private actions: Record<string, ActionHandler> = {};

  constructor(name: string) {
    this.name = name;
  }

  public registerAction(name: string, handler: ActionType, metadata: { description: string }) {
    if (name in this.actions) {
      throw new ActionsManagerError(`'${name}' action already exists in '${this.name}' namespace`);
    }

    this.actions[name] = {
      callback: handler,
      description: metadata.description,
    };
  }

  public getAction(name: string): ActionHandler | undefined {
    return this.actions[name];
  }
}

interface MacroExpression {
  action: string;
  args: Record<string, any>;
}
type MacroToken = 'action' | 'argumentName' | 'argumentValue';

class MacroParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'MacroParseError';
  }
}

export class MacroParser {
  public static async parseAndExecute(manager: ActionsManager, macro: string) {
    for (let expr of this.parse(macro)) {
      await manager.resolveAction(expr.action, expr.args);
    }
  }

  public static async parseSingleAndExecute(manager: ActionsManager, expression: string) {
    let expr = this.parseSingle(expression);
    await manager.resolveAction(expr.action, expr.args);
  }

  public static parse(macro: string): MacroExpression[] {
    return macro
      .split('\n')
      .filter((v) => v)
      .map(this.parseSingle);
  }

  public static parseSingle(expression: string): MacroExpression {
    let expectedToken: MacroToken = 'action';
    let action: string;
    let currentArgument;
    let args: Record<string, any> = {};

    // Simple FSM for parsing following grammar
    //   <expression>      ::= <action>, { <argument> }
    //   <action>          ::= <term>, ".", <term>, [ <digit> ]
    //   <term>            ::= ( <letter> | "-" | "_" ) { <letter> | "-" | "_" }
    //   <argument>        ::= <argument-name> ":" <argument-value>
    //   <argument-name>   ::= <letter> { <letter> | <digit> }
    //   <argument-value>  ::= <boolean> | <number> | <unquoted-string> | <quoted-string>
    //   <boolean>         ::= "True" | "true" | "False" | "false"
    //   <number>          ::= <number>, { <number> }, [ ".", <number>, { <number> } ]
    //   <unquoted-string> ::= { <letter> | "_" }, [ <letter> | <digit> | "_" | "-" | "." ]
    //   <quoted-string>   ::= '"', { <ascii-character> - '"' }, '"' | "'", { <ascii-character> - "'" }, "'"
    parsing: while (expression) {
      switch (expectedToken) {
        case 'action': {
          let m = expression.match(/^([a-z_\-]+\.[a-z_\-]+[0-9]*)(.*)/);
          if (m == null) {
            throw new MacroParseError('Unexpected action format');
          }

          let _, rest;
          [_, action, rest] = m;

          if (rest.length == 0) {
            // We've finished, no more text to parse…
            break parsing;
          }

          // …otherwise, we expect single space
          m = rest.match(/ ([^ ].*)/);
          if (m == null) {
            throw new MacroParseError('Action should be followed by single space');
          }

          // NOTE: Parse(action) -> Parse(argumentName)
          expectedToken = 'argumentName';
          expression = m[1];

          break;
        }
        case 'argumentName': {
          let m = expression.match(/^([a-zA-Z][a-zA-Z0-9]*):(.*)/);
          if (m == null) {
            throw new MacroParseError(`Invalid argument name: ${expression}`);
          }

          let _;
          [_, currentArgument, expression] = m;

          // NOTE: Parse(argumentName) -> Parse(argumentValue)
          expectedToken = 'argumentValue';
          break;
        }
        case 'argumentValue': {
          if (currentArgument === undefined) {
            // NOTE: This is unreachable
            throw null;
          }

          // We are expecting three kinds of arguments
          //   * number
          //   * boolean
          //   * unquoted string
          //   * quoted string (either " or ')
          let _, m, argument, rest;
          if ((m = expression.match(/^([0-9]+(?:\.[0-9]+)?)(.*)/)) !== null) {
            // Match number
            [_, argument, rest] = m;
            argument = +argument;
          } else if ((m = expression.match(/^([Tt]rue|[Ff]alse)(.*)/)) !== null) {
            // Match boolean
            [_, argument, rest] = m;
            argument = argument.toLowerCase() == 'true';
          } else if ((m = expression.match(/^([a-zA-Z_][a-zA-Z0-9_\-\.]*)(.*)/)) !== null) {
            // Match unquoted string
            [_, argument, rest] = m;
          } else if ((m = expression.match(/^"([^\\"]*|\\.)*"(.*)/)) !== null) {
            // Match string with ""
            [_, argument, rest] = m;
          } else if ((m = expression.match(/^'([^\\']*|\\.)*'(.*)/)) !== null) {
            // Match string with ''
            [_, argument, rest] = m;
          } else {
            throw new MacroParseError(`Invalid argument value: ${expression}`);
          }

          args[currentArgument] = argument;
          currentArgument = undefined;

          if (rest.length == 0) {
            // We've finished, no more text to parse…
            break parsing;
          }

          // …other-wise we expect single space
          m = rest.match(/ ([^ ].*)/);
          if (m == null) {
            throw new MacroParseError('Expected single space after argument');
          }

          expression = m[1];

          // NOTE: Parse(argumentValue) -> Parse(argumentName)
          expectedToken = 'argumentName';
        }
      }
    }

    return {
      action: action! as string,
      args,
    };
  }
}
