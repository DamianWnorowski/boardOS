/*
  # Populate Initial Resources Data

  1. Purpose
     - Pre-populate the resources table with all personnel and equipment data
     - Ensures data is available immediately when the application starts
     - Avoids RLS policy issues with anonymous users trying to insert data

  2. Data Populated
     - Personnel: Operators, drivers, laborers, foremen, stripers, private drivers
     - Equipment: Pavers, rollers, excavators, sweepers, milling machines, graders, dozers, payloaders, skidsteers
     - Vehicles: Trucks with unit numbers, models, VINs, and locations

  3. Security
     - Uses database migration context (bypasses RLS during setup)
     - No additional policies needed for anon users
*/

-- Personnel Data
INSERT INTO resources (type, name, identifier, location, on_site) VALUES
  ('operator', 'John Smith', 'OP001', 'Main Yard', true),
  ('operator', 'Mike Johnson', 'OP002', 'Main Yard', true),
  ('operator', 'Sarah Davis', 'OP003', 'East Yard', false),
  ('operator', 'Tom Wilson', 'OP004', 'Main Yard', true),
  ('operator', 'Lisa Brown', 'OP005', 'West Yard', false),
  ('driver', 'Dave Miller', 'DR001', 'Main Yard', true),
  ('driver', 'Jim Garcia', 'DR002', 'Main Yard', true),
  ('driver', 'Bob Martinez', 'DR003', 'East Yard', false),
  ('driver', 'Steve Rodriguez', 'DR004', 'Main Yard', true),
  ('driver', 'Joe Hernandez', 'DR005', 'West Yard', false),
  ('driver', 'Frank Lopez', 'DR006', 'Main Yard', true),
  ('driver', 'Rick Gonzalez', 'DR007', 'East Yard', false),
  ('driver', 'Paul Wilson', 'DR008', 'Main Yard', true),
  ('driver', 'Kevin Anderson', 'DR009', 'West Yard', false),
  ('driver', 'Mark Thomas', 'DR010', 'Main Yard', true),
  ('striper', 'Carlos Perez', 'ST001', 'Main Yard', true),
  ('striper', 'Antonio Silva', 'ST002', 'East Yard', false),
  ('striper', 'Miguel Santos', 'ST003', 'Main Yard', true),
  ('foreman', 'Robert Johnson', 'FM001', 'Main Yard', true),
  ('foreman', 'William Davis', 'FM002', 'East Yard', false),
  ('laborer', 'Jose Martinez', 'LB001', 'Main Yard', true),
  ('laborer', 'Alex Rodriguez', 'LB002', 'Main Yard', true),
  ('laborer', 'Chris Garcia', 'LB003', 'East Yard', false),
  ('laborer', 'Daniel Hernandez', 'LB004', 'Main Yard', true),
  ('laborer', 'Eric Lopez', 'LB005', 'West Yard', false),
  ('laborer', 'Ryan Gonzalez', 'LB006', 'Main Yard', true),
  ('laborer', 'Jason Wilson', 'LB007', 'East Yard', false),
  ('laborer', 'Brian Anderson', 'LB008', 'Main Yard', true),
  ('privateDriver', 'Independent Trucker 1', 'PD001', 'External', false),
  ('privateDriver', 'Independent Trucker 2', 'PD002', 'External', false);

-- Equipment Data
INSERT INTO resources (type, name, identifier, model, location, on_site) VALUES
  ('paver', 'Paver 1', 'PV001', 'Caterpillar AP1055F', 'Main Yard', true),
  ('paver', 'Paver 2', 'PV002', 'Volvo P6820D', 'East Yard', false),
  ('paver', 'Paver 3', 'PV003', 'Caterpillar AP1000F', 'Main Yard', true),
  ('roller', 'Roller 1', 'RL001', 'Caterpillar CB64', 'Main Yard', true),
  ('roller', 'Roller 2', 'RL002', 'Volvo DD120C', 'Main Yard', true),
  ('roller', 'Roller 3', 'RL003', 'Caterpillar CB66B', 'East Yard', false),
  ('roller', 'Roller 4', 'RL004', 'Hamm HD120', 'Main Yard', true),
  ('excavator', 'Excavator 1', 'EX001', 'Caterpillar 320', 'Main Yard', true),
  ('excavator', 'Excavator 2', 'EX002', 'Komatsu PC210', 'East Yard', false),
  ('sweeper', 'Street Sweeper 1', 'SW001', 'Elgin Crosswind', 'Main Yard', true),
  ('sweeper', 'Street Sweeper 2', 'SW002', 'Schwarze A7000', 'West Yard', false),
  ('millingMachine', 'Milling Machine 1', 'MM001', 'Caterpillar PM822', 'Main Yard', true),
  ('millingMachine', 'Milling Machine 2', 'MM002', 'Wirtgen W210', 'East Yard', false),
  ('grader', 'Motor Grader 1', 'GR001', 'Caterpillar 140M', 'Main Yard', true),
  ('grader', 'Motor Grader 2', 'GR002', 'John Deere 770G', 'West Yard', false),
  ('dozer', 'Bulldozer 1', 'BZ001', 'Caterpillar D6T', 'Main Yard', true),
  ('dozer', 'Bulldozer 2', 'BZ002', 'Komatsu D65PX', 'East Yard', false),
  ('payloader', 'Wheel Loader 1', 'WL001', 'Caterpillar 950M', 'Main Yard', true),
  ('payloader', 'Wheel Loader 2', 'WL002', 'Volvo L120H', 'West Yard', false),
  ('skidsteer', 'Skid Steer 1', 'SS001', 'Bobcat S770', 'Main Yard', true),
  ('skidsteer', 'Skid Steer 2', 'SS002', 'Caterpillar 299D3', 'East Yard', false);

-- Truck Data
INSERT INTO resources (type, name, identifier, model, vin, location, on_site) VALUES
  ('truck', 'Unit 101', 'TR101', 'Peterbilt 567', '1XPWD40X1ED215101', 'Main Yard', true),
  ('truck', 'Unit 102', 'TR102', 'Kenworth T880', '1XKYD49X2JJ215102', 'Main Yard', true),
  ('truck', 'Unit 103', 'TR103', 'Mack Granite', '1M2GR4GC8JM215103', 'East Yard', false),
  ('truck', 'Unit 104', 'TR104', 'Peterbilt 579', '1XPBDP9X4JD215104', 'Main Yard', true),
  ('truck', 'Unit 105', 'TR105', 'Kenworth T680', '1XKYDP9X5KJ215105', 'West Yard', false),
  ('truck', 'Unit 106', 'TR106', 'Volvo VNL', '4V4NC9EH6JN215106', 'Main Yard', true),
  ('truck', 'Unit 107', 'TR107', 'Freightliner Cascadia', '3AKJHED59JSDF215107', 'East Yard', false),
  ('truck', 'Unit 108', 'TR108', 'Mack Anthem', '1M1AK07Y5JM215108', 'Main Yard', true),
  ('truck', 'Unit 109', 'TR109', 'International LT Series', '3HSDJSJR9JN215109', 'West Yard', false),
  ('truck', 'Unit 110', 'TR110', 'Peterbilt 567', '1XPWD40X1ED215110', 'Main Yard', true),
  ('truck', 'Unit 111', 'TR111', 'Kenworth T880', '1XKYD49X2JJ215111', 'East Yard', false),
  ('truck', 'Unit 112', 'TR112', 'Mack Granite', '1M2GR4GC8JM215112', 'Main Yard', true),
  ('truck', 'Unit 113', 'TR113', 'Peterbilt 579', '1XPBDP9X4JD215113', 'West Yard', false),
  ('truck', 'Unit 114', 'TR114', 'Kenworth T680', '1XKYDP9X5KJ215114', 'Main Yard', true),
  ('truck', 'Unit 115', 'TR115', 'Volvo VNL', '4V4NC9EH6JN215115', 'East Yard', false),
  ('truck', 'Unit 116', 'TR116', 'Freightliner Cascadia', '3AKJHED59JSDF215116', 'Main Yard', true),
  ('truck', 'Unit 117', 'TR117', 'Mack Anthem', '1M1AK07Y5JM215117', 'West Yard', false),
  ('truck', 'Unit 118', 'TR118', 'International LT Series', '3HSDJSJR9JN215118', 'Main Yard', true),
  ('truck', 'Unit 119', 'TR119', 'Peterbilt 567', '1XPWD40X1ED215119', 'East Yard', false),
  ('truck', 'Unit 120', 'TR120', 'Kenworth T880', '1XKYD49X2JJ215120', 'Main Yard', true);