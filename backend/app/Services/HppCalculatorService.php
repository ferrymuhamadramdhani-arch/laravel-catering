<?php

namespace App\Services;

use App\Models\MenuItem;
use App\Models\MenuPackage;
use App\Models\MenuRecipeBom;
use App\Models\RawMaterial;

class HppCalculatorService
{
    /**
     * Convert raw material price to recipe unit cost.
     * E.g. Raw Material is Rp 40.000 / kg, recipe unit is gram -> cost per gram is 40.000 / 1000 = Rp 40.
     */
    public function calculateCostPerUnit(RawMaterial $rawMaterial, string $recipeUnit): float
    {
        $basePrice = (float) $rawMaterial->default_purchase_price;
        $rawUnit = strtolower(trim($rawMaterial->unit));
        $targetUnit = strtolower(trim($recipeUnit));

        if ($rawUnit === $targetUnit) {
            return $basePrice;
        }

        // Weight conversions
        if ($rawUnit === 'kg' && $targetUnit === 'gram') {
            return $basePrice / 1000;
        }
        if ($rawUnit === 'gram' && $targetUnit === 'kg') {
            return $basePrice * 1000;
        }

        // Volume conversions
        if ($rawUnit === 'liter' && $targetUnit === 'ml') {
            return $basePrice / 1000;
        }
        if ($rawUnit === 'ml' && $targetUnit === 'liter') {
            return $basePrice * 1000;
        }

        // Default: 1-to-1 fallback
        return $basePrice;
    }

    /**
     * Calculate and persist HPP and margin percentage for a MenuItem from its BOM recipes.
     */
    public function recalculateMenuItemHpp(MenuItem $menuItem): MenuItem
    {
        $recipes = MenuRecipeBom::where('menu_item_id', $menuItem->id)
            ->with('rawMaterial')
            ->get();

        $totalHpp = 0;

        foreach ($recipes as $recipe) {
            if ($recipe->rawMaterial) {
                $costPerUnit = $this->calculateCostPerUnit($recipe->rawMaterial, $recipe->unit);
                $subtotal = (float) $recipe->quantity * $costPerUnit;

                $recipe->cost_per_unit = $costPerUnit;
                $recipe->subtotal_cost = $subtotal;
                $recipe->save();

                $totalHpp += $subtotal;
            }
        }

        $sellingPrice = (float) $menuItem->selling_price;
        $marginPercentage = 0;
        if ($sellingPrice > 0) {
            $marginPercentage = (($sellingPrice - $totalHpp) / $sellingPrice) * 100;
        }

        $menuItem->calculated_hpp = round($totalHpp, 2);
        $menuItem->margin_percentage = round($marginPercentage, 2);
        $menuItem->save();

        // Also recalculate packages containing this menu item
        $this->recalculatePackagesForMenuItem($menuItem->id);

        return $menuItem;
    }

    /**
     * Recalculate HPP for all menu items that use a specific raw material.
     */
    public function recalculateForRawMaterial(int $rawMaterialId): void
    {
        $menuItemIds = MenuRecipeBom::where('raw_material_id', $rawMaterialId)
            ->pluck('menu_item_id')
            ->unique();

        foreach ($menuItemIds as $menuItemId) {
            $menuItem = MenuItem::find($menuItemId);
            if ($menuItem) {
                $this->recalculateMenuItemHpp($menuItem);
            }
        }
    }

    /**
     * Calculate and persist HPP for a MenuPackage from its bundled items.
     */
    public function recalculatePackageHpp(MenuPackage $package): MenuPackage
    {
        $package->loadMissing('packageItems.menuItem');

        $totalHpp = 0;
        foreach ($package->packageItems as $item) {
            if ($item->menuItem) {
                $totalHpp += ((float) $item->menuItem->calculated_hpp * (int) $item->quantity);
            }
        }

        $sellingPrice = (float) $package->selling_price;
        $marginPercentage = 0;
        if ($sellingPrice > 0) {
            $marginPercentage = (($sellingPrice - $totalHpp) / $sellingPrice) * 100;
        }

        $package->calculated_hpp = round($totalHpp, 2);
        $package->margin_percentage = round($marginPercentage, 2);
        $package->save();

        return $package;
    }

    /**
     * Recalculate all packages containing a specific menu item.
     */
    public function recalculatePackagesForMenuItem(int $menuItemId): void
    {
        $packageIds = \App\Models\MenuPackageItem::where('menu_item_id', $menuItemId)
            ->pluck('menu_package_id')
            ->unique();

        foreach ($packageIds as $packageId) {
            $package = MenuPackage::find($packageId);
            if ($package) {
                $this->recalculatePackageHpp($package);
            }
        }
    }
}
