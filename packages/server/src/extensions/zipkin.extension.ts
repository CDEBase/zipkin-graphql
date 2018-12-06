import { Tracer } from 'opentracing';
import { print, DocumentNode } from 'graphql';
import { GraphQLExtension, GraphQLResponse } from 'graphql-extensions';

export enum LogAction {
    request,
    parse,
    validation,
    execute,
    setup,
    cleanup,
}

export enum LogStep {
    start,
    end,
    status,
}

export interface LogMessage {
    data?: any;
    key?: string;
    step: LogStep;
    spanId?: string;
    action: LogAction;
}

export interface LogFunction {
    (message: LogMessage);
}

export class ZipkinGraphqlExtension implements GraphQLExtension<any> {
    constructor(
        private tracer: Tracer
    ) {  }

    span(msg: LogMessage) {
        return this.tracer.startSpan(`${msg.action}.${msg.step}`);
    }

    public requestDidStart(options: {
        request;
        queryString?: string;
        operationName?: string;
        parsedQuery?: DocumentNode;
        variables?: { [key: string]: any };
    }) {
        const msg = { action: LogAction.request, step: LogStep.start };
        const span = this.span(msg); 

        const loggedQuery = options.queryString || print(options.parsedQuery);

        span.log({
            key: 'query',
            data: loggedQuery,
            step: LogStep.status,
            action: LogAction.request,
        });

        span.log({
            key: 'variables',
            step: LogStep.status,
            data: options.variables,
            action: LogAction.request,
        });

        span.log({
            key: 'operationName',
            step: LogStep.status,
            action: LogAction.request,
            data: options.operationName,
        });

        return (...errors: Array<Error>) => {
            if (errors.length) {
                span.finish();
            }
        };
    }

    // public parsingDidStart() {
    //     const span = this.span({ 
    //         step: LogStep.start, 
    //         action: LogAction.parse, 
    //     });

    //     return () => span.finish();
    // }

    // public validationDidStart() {
    //     const span = this.span({ action: LogAction.validation, step: LogStep.start });
    //     return () => span.finish();
    // }

    // public executionDidStart() {
    //     const span = this.span({ action: LogAction.execute, step: LogStep.start });
    //     return () => span.finish();
    // }
}