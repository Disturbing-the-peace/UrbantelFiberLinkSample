-- Migration: Add Business Plans (BizEdge, FlexiBIZ, MicroBIZ)
-- Created: 2026-04-11

-- Insert BizEdge Plans
INSERT INTO plans (name, category, speed, price, inclusions) VALUES
('BizEdge 3000', 'Business', '120 Mbps', 3000, ARRAY[
  'Perfect for small teams needing steady, reliable speeds'
]),
('BizEdge 6000', 'Business', '250 Mbps', 6000, ARRAY[
  'Run daily ops and cloud tools with smoother performance'
]),
('BizEdge 11000', 'Business', '500 Mbps', 11000, ARRAY[
  'Ideal for growing firms with heavy data and video use'
]),
('BizEdge 15000', 'Business', '700 Mbps', 15000, ARRAY[
  'Power advanced workflows and hybrid teams seamlessly'
]),
('BizEdge 21000', 'Business', '1000 Mbps', 21000, ARRAY[
  'Enterprise-grade speed for nonstop, large-scale ops'
]);

-- Insert FlexiBIZ Plans
INSERT INTO plans (name, category, speed, price, inclusions) VALUES
('FlexiBIZ Plan 2000', 'Business', '100/50 Mbps', 2000, ARRAY[
  'Solid starter speed for small shops and teams'
]),
('FlexiBIZ Plan 4000', 'Business', '200/100 Mbps', 4000, ARRAY[
  'Keeps daily business smooth from open to close'
]),
('FlexiBIZ Plan 8000', 'Business', '400/200 Mbps', 8000, ARRAY[
  'Great for busier stores, cafés, or small offices'
]),
('FlexiBIZ Plan 12000', 'Business', '600/300 Mbps', 12000, ARRAY[
  'Handles online sales, bookings, and video calls'
]),
('FlexiBIZ Plan 15000', 'Business', '800/400 Mbps', 15000, ARRAY[
  'Extra speed for busy teams and bigger workloads'
]),
('FlexiBIZ Plan 18000', 'Business', '1000/500 Mbps', 18000, ARRAY[
  'Top speed to keep growing businesses connected'
]);

-- Insert MicroBIZ Max Plans
INSERT INTO plans (name, category, speed, price, inclusions) VALUES
('MicroBIZ Max 75', 'Business', '75 Mbps', 1449, ARRAY[
  'Sapat na bilis para tuloy-tuloy ang benta'
]),
('MicroBIZ Max 100', 'Business', '100 Mbps', 1599, ARRAY[
  'Swabeng koneksyon para dumami ang suki'
]),
('MicroBIZ Max 150', 'Business', '150 Mbps', 1799, ARRAY[
  'Dagdag bilis para sa dagdag na kita kada araw'
]),
('MicroBIZ Max 250', 'Business', '250 Mbps', 2099, ARRAY[
  'Koneksyong makikipagsabayan sa dami ng orders'
]),
('MicroBIZ Max 400', 'Business', '400 Mbps', 2499, ARRAY[
  'Itodo mo na para walang abala ang pagtinda'
]);

-- Verify insertion
SELECT 
  name, 
  category, 
  speed, 
  price 
FROM plans 
WHERE category = 'Business' 
ORDER BY price ASC;
