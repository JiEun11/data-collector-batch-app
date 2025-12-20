import { JsonRepository } from './json-repository';
import { Config, JsonDB } from 'node-json-db';
import { rimraf } from 'rimraf';

describe('JsonRepository test', function () {
  let testRepository: JsonRepository<any>;
  const databaseFilePath = `${__dirname}/fixture/testDataBase`;

  beforeEach(async () => {
    testRepository = await JsonRepository.create(
      new JsonDB(new Config(databaseFilePath, true, false, '/')),
    );
  });

  afterEach(async () => {
    await rimraf(`${databaseFilePath}.json`);
  });

  it('존재하지 않는 데이터를 조회하는 경우엔 null이 반환된다.', async function () {
    const findResult = await testRepository.find('key1');
    expect(findResult).toMatchInlineSnapshot(`null`);
  });

  it('정상적으로 저장이 된다.', async function () {
    await testRepository.save('key1', { foo: 1 });
    const findResult = await testRepository.find('key1');

    expect(findResult).toMatchInlineSnapshot(`
      {
        "foo": 1,
      }
    `);
  });

  it('동일한 키에 다른 데이터를 저장하면, 덮어씌워진다.', async function () {
    await testRepository.save('key1', { foo: 1 });
    await testRepository.save('key1', { foo: 2 });
    const findResult = await testRepository.find('key1');

    expect(findResult).toMatchInlineSnapshot(`
      {
        "foo": 2,
      }
    `);
  });

  it('subKey를 통해, 다중 데이터를 조회를 할 수 있다.', async function () {
    await testRepository.save('key1/subKey1', { foo: 1 });
    await testRepository.save('key1/subKey2', { bar: 2 });
    const findResult = await testRepository.find('key1');

    expect(findResult).toMatchInlineSnapshot(`
      {
        "subKey1": {
          "foo": 1,
        },
        "subKey2": {
          "bar": 2,
        },
      }
    `);
  });

  it('데이터가 정상적으로 삭제가 된다.', async function () {
    await testRepository.save('key1', { foo: 1 });
    await testRepository.save('key2', { bar: 2 });
    const beforeDelete = await testRepository.find('key1');

    expect(beforeDelete).toMatchInlineSnapshot(`
      {
        "foo": 1,
      }
    `);
    await testRepository.delete('key1');
    const afterDelete = await testRepository.find('key1');
    expect(afterDelete).toMatchInlineSnapshot(`null`);
  });
});
