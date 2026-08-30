import {
  Container,
  type ContainerModule,
  type ServiceIdentifier,
} from 'inversify'

export interface TestContainerOverride<T> {
  identifier: ServiceIdentifier<T>
  value: T
}

export function createTestContainer(
  modules: ContainerModule[],
  overrides: TestContainerOverride<unknown>[] = []
): Container {
  const container = new Container({ autobind: true, defaultScope: 'Singleton' })
  container.load(...modules)

  for (const { identifier, value } of overrides) {
    container.rebindSync(identifier).toConstantValue(value)
  }

  return container
}
