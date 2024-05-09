import { type DefaultBodyType, type HttpResponseResolver, type PathParams } from 'msw';

export type DefaultHttpResponseResolver = HttpResponseResolver<PathParams, DefaultBodyType, undefined>;
