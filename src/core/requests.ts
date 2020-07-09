import { API } from '../types/api/module';
import fetch, { HeadersInit, RequestInit } from 'node-fetch';

import URLFormatter from './formatter.js';
import Cache from './cache.js';
import Hash from './hash.js';

import { resolve } from 'path';
import { existsSync, mkdirSync } from 'fs';
// import { URL } from 'url';

// Модуль запросов
class Requests {
  private formatter: URLFormatter = new URLFormatter();
  private cache: Cache = new Cache();
  private hash: Hash = new Hash();

  private hh_headers: HeadersInit = {
    'User-Agent': 'node-hh-parser (vadim.kuz02@gmail.com)'
  };

  /**
   * делает запрос для получения общего числа вакансий по запросу
   * @param url - строка вида URL
   */
  private getFound = async (url: string): Promise<number> => {
    // изменить per_page=*число* в url на per_page=0,
    // чтобы не получать ненужные данные
    url = url.replace(/per_page=(100)|[0-9]\d?/, 'per_page=0');

    console.log(encodeURI(url));

    // сделать запрос и дождаться json-представления
    const data: any = await fetch(encodeURI(url), {
      headers: this.hh_headers
    }).then((res) => res.json());

    // взять нужное поле found
    return data.found;
  };

  // public getClusters = async (query: API.Query): Promise<API.Vacancy[]> => {};

  /**
   * асинхронно делает запросы на REST API, возвращает массив вакансий
   * @param query - запрос, объект типа API.Query
   * @param limit - ограничение по количеству требуемых к выдаче вакансий
   */
  public getVacancies = async (
    base_api_url: API.URL,
    limit = 2000
  ): Promise<API.Vacancy[]> => {
    // получить строчное представление url
    const base_url = this.formatter.getURL(base_api_url);

    console.log(base_url);

    // общее число найденных вакансий
    const found: number = await this.getFound(base_url);

    console.log('found:', found, 'vacancies');

    // получаем количество элементов на страницу
    const per_page: number = base_api_url.query.per_page ?? 100;

    // вычисляем количество требуемых страниц
    const pages: number = Math.ceil(
      (found <= limit ? found : limit) / per_page
    );
    console.log('parsed pages:', pages);

    // сгенерировать массив ссылок числом pages, с пагинацией page
    const urls: string[] = Array.from(
      Array(pages).fill(base_url),
      (url: string, page: number) =>
        url.replace(/&page=([0-9]|1[0-9])/, `&page=${page}`)
    );

    // сделать серию ассинхронных запросов, получить promise представления json
    const data: Promise<API.Vacancy>[] = urls.map((url) =>
      this.fetchCache(encodeURI(url), { headers: this.hh_headers })
    );

    // дождаться резолва промисов, получить их поля items
    const vacancies: API.Vacancy[] = [].concat(
      ...(await Promise.all(data)).map((page) => page.items)
    );

    return vacancies;
  };

  /**
   * асинхронно делает запросы по ссылкам urls, возвращает массив из полных вакансий
   * @param urls - массив из строк вида URL
   */
  public getFullVacancies = async (
    urls: string[]
  ): Promise<API.FullVacancy[]> => {
    const data: Promise<API.FullVacancy>[] = urls.map((url) =>
      this.fetchCache(url, { headers: this.hh_headers })
    );

    const full_vacancies: API.FullVacancy[] = await Promise.all(data);

    return full_vacancies;
  };

  /**
   * получение валют
   */
  public getCurrency = async (
    linkToCurrencies: string,
    currency = 'USD'
  ): Promise<number> => {
    const currency_json = await this.fetchCacheCurrency(linkToCurrencies);

    return currency_json.Valute[currency].Value;
  };

  /**
   * Проверяет на наличие кеша от предыдущих вызовов.
   *
   * Если кеш есть, читает информацию из него.
   *
   * Если же его нет, делает новый @fetch , получает json и кеширует результат.
   *
   * @param url - строка вида URL
   * @param init - объект RequestInit
   */
  private fetchCache = async (
    url: string,
    init?: RequestInit
  ): Promise<any> => {
    const cahceDirPath = './cache';
    if (!existsSync(cahceDirPath)) {
      mkdirSync(cahceDirPath);
    }

    const cacheHash: string = this.hash.md5(url);
    const cacheFilePath: string = resolve(
      process.cwd(),
      cahceDirPath,
      `${cacheHash}`
    );

    if (existsSync(cacheFilePath)) {
      // read from cache
      const data: any = this.cache.get(cacheFilePath);

      return data;
    } else {
      // make new fetch and get json
      const data: any = await fetch(url, init).then((res) => res.json());

      // add data to cache
      this.cache.add(cacheFilePath, data);

      return data;
    }
  };

  private fetchCacheCurrency = async (
    url: string,
    init?: RequestInit
  ): Promise<any> => {
    const cahceDirPath = './cache';
    if (!existsSync(cahceDirPath)) {
      mkdirSync(cahceDirPath);
    }

    const today_date: string = new Date().toISOString().split('T')[0];
    const today_date_hash: string = this.hash.md5(today_date);

    const cacheFilePath: string = resolve(
      process.cwd(),
      cahceDirPath,
      `${today_date_hash}`
    );

    if (existsSync(cacheFilePath)) {
      // read from cache
      const data: any = this.cache.get(cacheFilePath);

      return data;
    } else {
      // make new fetch and get json
      const data: any = await fetch(url, init).then((res) => res.json());

      // add data to cache
      this.cache.add(cacheFilePath, data);

      return data;
    }
  };
}

export default Requests;
