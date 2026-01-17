-- Create materials table
CREATE TABLE IF NOT EXISTS materials (
  "id" text PRIMARY KEY,
  "name" text,
  "brand" text,
  "unit" text,
  "unitPrice" numeric,
  "costPerVal" numeric, -- 換算成本小計
  "updatedAt" timestamp with time zone DEFAULT now()
);

-- Create method_recipes table
CREATE TABLE IF NOT EXISTS method_recipes (
  "id" text PRIMARY KEY,
  "methodId" text, -- links to methods.id
  "materialId" text, -- links to materials.id
  "quantity" numeric, -- Base Quantity (from CSV '數量')
  "category" text, -- 'fixed' (Tool) or 'variable' (Material/Labor)
  "consumptionRate" numeric, -- Calculated: FinalCostPing / UnitPrice
  "note" text
);

-- Enable RLS
ALTER TABLE materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE method_recipes ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Enable all access for materials" ON materials FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all access for method_recipes" ON method_recipes FOR ALL USING (true) WITH CHECK (true);
