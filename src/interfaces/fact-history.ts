import { FactData } from "./fact-data";

export interface FactHistory<T> {
    list: FactData<T>[];
    totalCount: number;
}