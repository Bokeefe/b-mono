import { Controller, Get, Query } from '@nestjs/common';

import { parseHave } from './recipes.match';
import { RecipesService } from './recipes.service';

@Controller('/api/recipes')
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  // curl -X GET "http://localhost:4171/api/recipes"
  // curl -X GET "http://localhost:4171/api/recipes?have=bread,jelly,peanut%20butter"
  // curl -X GET "http://localhost:4171/api/recipes?have=eggs,shallots&have=cheese"
  @Get()
  getRecipes(@Query('have') have: string | string[]) {
    return this.recipesService.getPayload(parseHave(have));
  }
}
