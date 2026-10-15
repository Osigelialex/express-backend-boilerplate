/**
 * Class decorator: every `new Decorated()` returns the same instance.
 *
 *   @singleton
 *   export class UserService { ... }
 *
 * Useful for stateless services that are constructed from several routers.
 * (A Proxy keeps the class's static members and TypeScript type intact.)
 * Don't use it on classes that take per-instance dependencies you want to
 * swap in tests - construct those normally and pass the mock in.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function singleton<T extends new (...args: any[]) => object>(Base: T): T {
  let instance: InstanceType<T> | undefined;

  return new Proxy(Base, {
    construct(target, args, newTarget) {
      if (!instance) {
        instance = Reflect.construct(target, args, newTarget) as InstanceType<T>;
      }
      return instance;
    },
  });
}
