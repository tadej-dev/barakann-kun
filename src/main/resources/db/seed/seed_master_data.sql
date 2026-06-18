TRUNCATE TABLE parts RESTART IDENTITY CASCADE;
TRUNCATE TABLE brands RESTART IDENTITY CASCADE;
TRUNCATE TABLE categories RESTART IDENTITY CASCADE;

INSERT INTO brands (id, name, created_at, updated_at)
VALUES (1, 'Barakann', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
       (2, 'Shimano', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
       (3, 'Fulcrum', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
       (4, 'Mavic', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
       (5, 'Continental', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);

INSERT INTO categories (id, "key", display_name)
VALUES (1, 'frame', 'フレーム'),
       (2, 'component', 'コンポ'),
       (3, 'wheel', 'ホイール');

INSERT INTO parts (id,
                   name,
                   weight,
                   price,
                   brand_id,
                   category_id,
                   created_at,
                   updated_at)
VALUES (1, 'Astra CR Disc 49', 890, 148000, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
       (2, 'Astra CR Disc 52', 930, 152000, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
       (3, 'Climb Pro Carbon', 760, 238000, 1, 1, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

       (4, 'Shimano 105 Di2', 2994, 132000, 2, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
       (5, 'Shimano Ultegra Di2', 2716, 218000, 2, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
       (6, 'Mechanical 105', 3120, 92000, 2, 2, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),

       (7, 'Carbon 45 Disc', 1445, 88000, 3, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
       (8, 'Alloy Endurance 30', 1720, 46800, 4, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
       (9, 'Carbon 50 Aero', 1510, 112000, 3, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP),
       (10, 'Climb Lite 36', 1298, 138000, 4, 3, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP);