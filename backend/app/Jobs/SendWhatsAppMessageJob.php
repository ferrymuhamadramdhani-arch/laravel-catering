<?php

namespace App\Jobs;

use App\Models\Order;
use App\Models\Tenant;
use App\Services\WhatsAppNotificationService;
use Illuminate\Bus\Queueable;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Bus\Dispatchable;
use Illuminate\Queue\InteractsWithQueue;
use Illuminate\Queue\SerializesModels;

class SendWhatsAppMessageJob implements ShouldQueue
{
    use Dispatchable, InteractsWithQueue, Queueable, SerializesModels;

    public function __construct(
        public Tenant $tenant,
        public string $templateCode,
        public string $recipientPhone,
        public string $recipientName,
        public array $variables = [],
        public ?Order $order = null
    ) {}

    public function handle(WhatsAppNotificationService $waService): void
    {
        $waService->sendTemplatedMessage(
            $this->tenant,
            $this->templateCode,
            $this->recipientPhone,
            $this->recipientName,
            $this->variables,
            $this->order
        );
    }
}
