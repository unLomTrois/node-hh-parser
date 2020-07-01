import { Parser } from '../types/core/module';
import { writeFile, existsSync, mkdirSync } from 'fs';
import { resolve } from 'path';
import Requests from './requests.js';
import { API } from '../types/api/module';

class Core implements Parser.Core {
  private requests: Requests = new Requests();

  /**
   * makeRequest
   */
  public makeRequest = async (
    query: API.Query,
    limit: number
  ): Promise<any[]> => {
    return this.requests.getVacancies(query, limit);
  };

  /**
   * метод сохранения вакансий
   * @param vacancies - массив вакансий
   * @param dir - директория для сохранения логов
   */
  public saveVacancies = async (
    vacancies: any[],
    dir = './log'
  ): Promise<void> => {
    // если нет папки для сохранения логов, создать её
    if (!existsSync(dir)) {
      mkdirSync(dir);
    }

    // получение информации промиса
    console.log(`${vacancies.length} vacancies have parsed`);

    // получить путь для сохранения
    const log_path = resolve(process.cwd(), dir, 'vacancies.json');

    // сохранить вакансии
    writeFile(log_path, JSON.stringify(vacancies, undefined, 2), (err) => {
      if (err) throw err;
      console.log('completely saved');
    });
  };
}

export default Core;