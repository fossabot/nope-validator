import { IValidatable, Nil, Rule } from './types';
import NopeReference from './NopeReference';
import {
  resolveNopeRefsFromKeys,
  every,
  resolveNopeRef
} from './utils';

abstract class NopePrimitive<T> implements IValidatable<T> {
  protected validationRules: Array<Rule<T>> = [];

  public required(message = 'This field is required') {
    const rule: Rule<T> = entry => {
      if (entry === undefined || entry === null) {
        return message;
      }
    };

    return this.test(rule);
  }

  public when(
    keys: string[] | string,
    conditionObject: {
      is: boolean | ((...args: any) => boolean);
      then: NopePrimitive<any>;
      otherwise: NopePrimitive<any>;
    },
  ) {
    const ctxKeys = Array.isArray(keys) ? keys : [keys];

    const rule: Rule<T> = (_, context) => {
      const resolvedConditionValues = resolveNopeRefsFromKeys(ctxKeys, context);

      const values = [...resolvedConditionValues];

      const condIs = conditionObject.is;

      const result =
        typeof condIs === 'function'
          ? condIs(...values)
          : every(resolvedConditionValues, (val: any) => val === condIs);

      return result ? conditionObject.then : conditionObject.otherwise;
    };

    return this.test(rule);
  }

  public oneOf(options: Array<T | NopeReference | Nil>, message = 'Invalid option') {
    const rule: Rule<T> = (entry, context) => {
      const resolvedOptions = options.map(option => resolveNopeRef(option, context));

      if (resolvedOptions.indexOf(entry) === -1) {
        return message;
      }
    };

    return this.test(rule);
  }

  public notOneOf(options: Array<T | NopeReference | Nil>, message = 'Invalid Option') {
    const rule: Rule<T> = (entry, context) => {
      const resolvedOptions = options.map(option => resolveNopeRef(option, context));

      if (resolvedOptions.indexOf(entry) !== -1) {
        return message;
      }
    };

    return this.test(rule);
  }

  public test(rule: Rule<T>) {
    this.validationRules.push(rule);

    return this;
  }

  /**
   * @param entry - The value to be validated
   * @param context - Used for internal reference resolving. Do not pass this.
   */
  public validate(entry?: T | Nil, context?: object | undefined): string | undefined {
    for (const rule of this.validationRules) {
      const error = rule(entry, context);

      if (error instanceof NopePrimitive) {
        return error.validate(entry, context);
      } else if (error) {
        return error;
      }
    }
  }
}

export default NopePrimitive;
