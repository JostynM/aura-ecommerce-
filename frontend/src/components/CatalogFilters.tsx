import "./CatalogFilters.css";


type CatalogFiltersProps = {
  selectedTypes: string[];

  selectedGenders: string[];

  selectedBrands: string[];

  availableBrands: string[];

  onTypeChange: (
    type: string,
  ) => void;

  onGenderChange: (
    gender: string,
  ) => void;

  onBrandChange: (
    brand: string,
  ) => void;

  onClear: () => void;
};


function CatalogFilters({
  selectedTypes,
  selectedGenders,
  selectedBrands,
  availableBrands,
  onTypeChange,
  onGenderChange,
  onBrandChange,
  onClear,
}: CatalogFiltersProps) {

  const hasActiveFilters =
    selectedTypes.length > 0 ||
    selectedGenders.length > 0 ||
    selectedBrands.length > 0;


  return (
    <aside className="catalog-filters">

      {/* =====================================
          CABECERA
      ===================================== */}

      <div className="filters-title">

        <h3>
          Filtros
        </h3>


        {hasActiveFilters && (

          <button
            type="button"
            onClick={onClear}
          >
            Limpiar
          </button>

        )}

      </div>


      {/* =====================================
          TIPO
      ===================================== */}

      <div className="filter-group">

        <h4>
          Tipo
        </h4>


        <label>

          <input
            type="checkbox"
            checked={
              selectedTypes.includes(
                "arabe",
              )
            }
            onChange={() =>
              onTypeChange(
                "arabe",
              )
            }
          />

          <span>
            Árabe
          </span>

        </label>


        <label>

          <input
            type="checkbox"
            checked={
              selectedTypes.includes(
                "diseñador",
              )
            }
            onChange={() =>
              onTypeChange(
                "diseñador",
              )
            }
          />

          <span>
            Diseñador
          </span>

        </label>

      </div>


      {/* =====================================
          GÉNERO
      ===================================== */}

      <div className="filter-group">

        <h4>
          Género
        </h4>


        <label>

          <input
            type="checkbox"
            checked={
              selectedGenders.includes(
                "hombre",
              )
            }
            onChange={() =>
              onGenderChange(
                "hombre",
              )
            }
          />

          <span>
            Hombre
          </span>

        </label>


        <label>

          <input
            type="checkbox"
            checked={
              selectedGenders.includes(
                "mujer",
              )
            }
            onChange={() =>
              onGenderChange(
                "mujer",
              )
            }
          />

          <span>
            Mujer
          </span>

        </label>


        <label>

          <input
            type="checkbox"
            checked={
              selectedGenders.includes(
                "unisex",
              )
            }
            onChange={() =>
              onGenderChange(
                "unisex",
              )
            }
          />

          <span>
            Unisex
          </span>

        </label>

      </div>


      {/* =====================================
          MARCAS
      ===================================== */}

      <div className="filter-group">

        <h4>
          Marca
        </h4>


        {availableBrands.length > 0 ? (

          availableBrands.map(
            (brand) => (

              <label
                key={brand}
              >

                <input
                  type="checkbox"
                  checked={
                    selectedBrands.includes(
                      brand,
                    )
                  }
                  onChange={() =>
                    onBrandChange(
                      brand,
                    )
                  }
                />

                <span>
                  {brand}
                </span>

              </label>

            ),
          )

        ) : (

          <p className="filter-empty">
            No hay marcas disponibles.
          </p>

        )}

      </div>

    </aside>
  );
}


export default CatalogFilters;