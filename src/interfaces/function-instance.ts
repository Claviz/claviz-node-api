export interface FunctionInstance {
    status: 'error' | 'success' | 'processing';
    result: any;
    error: any;
    startDate: string;
    id: string;
    parentFunctionInstanceId: string;
}