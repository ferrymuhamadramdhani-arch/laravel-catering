<?php

namespace App\Http\Controllers;

use OpenApi\Attributes as OA;

#[OA\Info(
    version: '1.0.0',
    title: 'CaterOS SaaS API Documentation',
    description: 'Dokumentasi RESTful API untuk platform SaaS Management Catering End-to-End CaterOS.',
    contact: new OA\Contact(
        name: 'CaterOS Engineering Team',
        email: 'dev@cateros.id'
    )
)]
#[OA\Server(
    url: 'http://127.0.0.1:8000/api/v1',
    description: 'Local Development Server'
)]
#[OA\SecurityScheme(
    securityScheme: 'bearerAuth',
    type: 'http',
    scheme: 'bearer',
    bearerFormat: 'JWT',
    description: 'Masukkan Token Bearer Sanctum (contoh: 1|abcdef...)'
)]
#[OA\SecurityScheme(
    securityScheme: 'TenantHeader',
    type: 'apiKey',
    name: 'X-Tenant-ID',
    in: 'header',
    description: 'Header ID Tenant yang sedang aktif (contoh: 1)'
)]
abstract class Controller
{
    //
}
